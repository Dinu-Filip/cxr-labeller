from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import current_reviewer, require_admin
from config import cors_origins
from db import get_db
from models import Primitive, Reviewer, SimilarityRating
from pairs import (
    InvalidPairError,
    canonical,
    pair_id,
    parse_pair_id,
    total_pairs,
    unrated_pairs,
)
from schemas import (
    BatchRatingIn,
    ExportRatingOut,
    MeOut,
    PairOut,
    PrimitiveOut,
    RatingIn,
    RatingOut,
)

app = FastAPI(title="cxr-labeller backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def _rating_out(rating: SimilarityRating) -> RatingOut:
    return RatingOut(
        pair_id=pair_id(rating.primitive_a_id, rating.primitive_b_id),
        primitive_a_id=rating.primitive_a_id,
        primitive_b_id=rating.primitive_b_id,
        level=rating.level,
        created_at=rating.created_at,
        updated_at=rating.updated_at,
    )


def _require_primitives(db: Session, a: int, b: int) -> None:
    found = db.scalars(select(Primitive.id).where(Primitive.id.in_({a, b}))).all()
    missing = {a, b} - set(found)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"unknown primitive id(s): {sorted(missing)}",
        )


def _upsert(
    db: Session, reviewer_id: int, a: int, b: int, level: str
) -> SimilarityRating:
    """
    Upsert without a dialect-specific ON CONFLICT, so the same path works on
    Postgres and on SQLite in tests. The unique constraint remains the
    authority: a lost race surfaces as IntegrityError and is retried as an
    update.
    """
    for attempt in (0, 1):
        existing = db.scalar(
            select(SimilarityRating).where(
                SimilarityRating.primitive_a_id == a,
                SimilarityRating.primitive_b_id == b,
                SimilarityRating.reviewer_id == reviewer_id,
            )
        )
        if existing is not None:
            existing.level = level
            db.commit()
            db.refresh(existing)
            return existing

        rating = SimilarityRating(
            primitive_a_id=a,
            primitive_b_id=b,
            reviewer_id=reviewer_id,
            level=level,
        )
        db.add(rating)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            if attempt == 1:
                raise
            continue
        db.refresh(rating)
        return rating

    raise AssertionError("unreachable")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/me", response_model=MeOut)
def me(
    reviewer: Reviewer = Depends(current_reviewer),
    db: Session = Depends(get_db),
):
    rated = (
        db.scalar(
            select(func.count())
            .select_from(SimilarityRating)
            .where(SimilarityRating.reviewer_id == reviewer.id)
        )
        or 0
    )
    total = total_pairs(db)
    return MeOut(
        id=reviewer.id,
        name=reviewer.name,
        rated=rated,
        total_pairs=total,
        remaining=max(total - rated, 0),
    )


@app.get("/primitives", response_model=list[PrimitiveOut])
def list_primitives(
    _: Reviewer = Depends(current_reviewer),
    db: Session = Depends(get_db),
):
    return db.scalars(select(Primitive).order_by(Primitive.id)).all()


@app.get("/pairs", response_model=list[PairOut])
def next_pairs(
    limit: int = Query(default=50, ge=1, le=500),
    reviewer: Reviewer = Depends(current_reviewer),
    db: Session = Depends(get_db),
):
    return [
        PairOut(
            id=pair_id(a.id, b.id),
            a=PrimitiveOut.model_validate(a),
            b=PrimitiveOut.model_validate(b),
        )
        for a, b in unrated_pairs(db, reviewer.id, limit)
    ]


@app.get("/ratings", response_model=list[RatingOut])
def list_ratings(
    reviewer: Reviewer = Depends(current_reviewer),
    db: Session = Depends(get_db),
):
    ratings = db.scalars(
        select(SimilarityRating)
        .where(SimilarityRating.reviewer_id == reviewer.id)
        .order_by(SimilarityRating.created_at, SimilarityRating.id)
    ).all()
    return [_rating_out(rating) for rating in ratings]


@app.put("/ratings/{raw_pair_id}", response_model=RatingOut)
def put_rating(
    raw_pair_id: str,
    body: RatingIn,
    reviewer: Reviewer = Depends(current_reviewer),
    db: Session = Depends(get_db),
):
    try:
        a, b = parse_pair_id(raw_pair_id)
    except InvalidPairError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    _require_primitives(db, a, b)
    return _rating_out(_upsert(db, reviewer.id, a, b, body.level))


@app.delete("/ratings/{raw_pair_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rating(
    raw_pair_id: str,
    reviewer: Reviewer = Depends(current_reviewer),
    db: Session = Depends(get_db),
):
    try:
        a, b = parse_pair_id(raw_pair_id)
    except InvalidPairError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    existing = db.scalar(
        select(SimilarityRating).where(
            SimilarityRating.primitive_a_id == a,
            SimilarityRating.primitive_b_id == b,
            SimilarityRating.reviewer_id == reviewer.id,
        )
    )
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    db.delete(existing)
    db.commit()


@app.post("/ratings/batch", response_model=list[RatingOut])
def batch_ratings(
    body: list[BatchRatingIn],
    reviewer: Reviewer = Depends(current_reviewer),
    db: Session = Depends(get_db),
):
    """Flush a queue of offline ratings. Last entry wins for a repeated pair."""
    parsed: list[tuple[int, int, str]] = []
    for entry in body:
        try:
            a, b = parse_pair_id(entry.pair_id)
        except InvalidPairError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
            ) from exc
        parsed.append((a, b, entry.level))

    ids = {value for a, b, _ in parsed for value in (a, b)}
    if ids:
        found = set(db.scalars(select(Primitive.id).where(Primitive.id.in_(ids))).all())
        missing = ids - found
        if missing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"unknown primitive id(s): {sorted(missing)}",
            )

    deduped: dict[tuple[int, int], str] = {}
    for a, b, level in parsed:
        deduped[(a, b)] = level

    return [
        _rating_out(_upsert(db, reviewer.id, a, b, level))
        for (a, b), level in deduped.items()
    ]


@app.get(
    "/export",
    response_model=list[ExportRatingOut],
    dependencies=[Depends(require_admin)],
)
def export_ratings(db: Session = Depends(get_db)):
    rows = db.execute(
        select(SimilarityRating, Reviewer.name)
        .join(Reviewer, Reviewer.id == SimilarityRating.reviewer_id)
        .order_by(SimilarityRating.id)
    ).all()
    return [
        ExportRatingOut(
            **_rating_out(rating).model_dump(),
            reviewer_id=rating.reviewer_id,
            reviewer_name=reviewer_name,
        )
        for rating, reviewer_name in rows
    ]


__all__ = ["app", "canonical"]

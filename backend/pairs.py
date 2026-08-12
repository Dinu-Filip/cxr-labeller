import hashlib

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models import Primitive, SimilarityRating


class InvalidPairError(ValueError):
    pass


def canonical(a: int, b: int) -> tuple[int, int]:
    """Order a pair so that (A,B) and (B,A) resolve to the same row."""
    if a == b:
        raise InvalidPairError("a pair must reference two different primitives")
    return (a, b) if a < b else (b, a)


def pair_id(a: int, b: int) -> str:
    low, high = canonical(a, b)
    return f"{low}-{high}"


def parse_pair_id(value: str) -> tuple[int, int]:
    parts = value.split("-")
    if len(parts) != 2:
        raise InvalidPairError(f"malformed pair id: {value!r}")
    try:
        a, b = int(parts[0]), int(parts[1])
    except ValueError as exc:
        raise InvalidPairError(f"malformed pair id: {value!r}") from exc
    return canonical(a, b)


def total_pairs(db: Session) -> int:
    n = db.scalar(select(func.count()).select_from(Primitive)) or 0
    return n * (n - 1) // 2


def _shuffle_key(reviewer_id: int, a: int, b: int) -> str:
    """Stable per-reviewer ordering, so reviewers do not all fatigue on the
    same pairs in the same sequence."""
    return hashlib.md5(
        f"{reviewer_id}:{a}-{b}".encode(), usedforsecurity=False
    ).hexdigest()


def unrated_pairs(
    db: Session, reviewer_id: int, limit: int
) -> list[tuple[Primitive, Primitive]]:
    """
    Pairs this reviewer has not rated, least-covered first so that ratings
    spread across the pair space instead of piling onto whichever pairs happen
    to sort first.

    Ordering happens in Python rather than SQL: the coverage-plus-hash sort key
    would need md5() in the database, which Postgres has and SQLite does not.
    The candidate set is C(n,2), so this is comfortable for the tens-to-low
    hundreds of primitives this tool is built for and would need revisiting well
    beyond that.
    """
    mine = (
        select(SimilarityRating.primitive_a_id, SimilarityRating.primitive_b_id)
        .where(SimilarityRating.reviewer_id == reviewer_id)
        .subquery()
    )

    a = db.query(Primitive).subquery("a")
    b = db.query(Primitive).subquery("b")

    coverage = (
        select(
            SimilarityRating.primitive_a_id,
            SimilarityRating.primitive_b_id,
            func.count().label("n"),
        )
        .group_by(SimilarityRating.primitive_a_id, SimilarityRating.primitive_b_id)
        .subquery()
    )

    stmt = (
        select(a.c.id, b.c.id, func.coalesce(coverage.c.n, 0))
        .join(b, a.c.id < b.c.id)
        .outerjoin(
            coverage,
            (coverage.c.primitive_a_id == a.c.id)
            & (coverage.c.primitive_b_id == b.c.id),
        )
        .outerjoin(
            mine,
            (mine.c.primitive_a_id == a.c.id) & (mine.c.primitive_b_id == b.c.id),
        )
        .where(mine.c.primitive_a_id.is_(None))
    )

    candidates = db.execute(stmt).all()
    candidates.sort(key=lambda row: (row[2], _shuffle_key(reviewer_id, row[0], row[1])))

    chosen = candidates[:limit]
    ids = {row[0] for row in chosen} | {row[1] for row in chosen}
    if not ids:
        return []

    by_id = {
        primitive.id: primitive
        for primitive in db.scalars(
            select(Primitive).where(Primitive.id.in_(ids))
        ).all()
    }
    return [(by_id[row[0]], by_id[row[1]]) for row in chosen]

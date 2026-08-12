"""Summarise rating progress across all reviewers.

Reads the database directly, so it is gated by database access rather than by
ADMIN_TOKEN — run it where the server runs, the same way as seed.py and
issue_token.py. Nothing here is exposed over the API: reviewers must not see
each other's counts.
"""

from collections import Counter

from sqlalchemy import func, select

from db import SessionLocal
from models import Primitive, Reviewer, SimilarityRating
from pairs import total_pairs


def main() -> None:
    with SessionLocal() as db:
        primitive_count = db.scalar(select(func.count()).select_from(Primitive)) or 0
        total = total_pairs(db)
        reviewers = db.scalars(select(Reviewer).order_by(Reviewer.id)).all()

        rated_by_reviewer = dict(
            db.execute(
                select(SimilarityRating.reviewer_id, func.count()).group_by(
                    SimilarityRating.reviewer_id
                )
            ).all()
        )

        # One row per pair that anyone has rated, with how many reviewers rated it.
        per_pair = db.execute(
            select(
                SimilarityRating.primitive_a_id,
                SimilarityRating.primitive_b_id,
                func.count(),
            ).group_by(SimilarityRating.primitive_a_id, SimilarityRating.primitive_b_id)
        ).all()

        print(f"{primitive_count} primitives -> {total} pairs")
        print(
            f"{len(reviewers)} reviewers, {sum(rated_by_reviewer.values())} ratings\n"
        )

        if total == 0:
            print("No pairs to rate yet; seed the primitive list first.")
            return

        # --- per reviewer ---------------------------------------------------
        width = max((len(r.name) for r in reviewers), default=8)
        print(f"{'reviewer':<{width}}  {'rated':>6}  {'of':>6}  {'done':>7}  status")
        for reviewer in reviewers:
            rated = rated_by_reviewer.get(reviewer.id, 0)
            share = rated / total * 100
            status = (
                "revoked"
                if reviewer.revoked_at
                else "expires " + reviewer.expires_at.date().isoformat()
                if reviewer.expires_at
                else "active"
            )
            print(
                f"{reviewer.name:<{width}}  {rated:>6}  {total:>6}  {share:>6.1f}%  {status}"
            )

        # --- pairs by how many reviewers have rated them ---------------------
        histogram = Counter(count for _, _, count in per_pair)
        histogram[0] = total - len(per_pair)

        if histogram[0] < 0:
            print(
                f"\nwarning: {len(per_pair)} pairs have ratings but only {total} "
                "pairs are possible — the primitive list may have shrunk"
            )
            histogram[0] = 0

        # Down from the most any pair could have, so gaps show up as explicit
        # zero rows rather than as missing lines.
        top = max([len(reviewers), *histogram])
        print(f"\n{'reviews':>7}  {'pairs':>6}  {'that many or more':>18}")
        at_least = 0
        for n in range(top, -1, -1):
            at_least += histogram.get(n, 0)
            print(f"{n:>7}  {histogram.get(n, 0):>6}  {at_least:>18}")


if __name__ == "__main__":
    main()

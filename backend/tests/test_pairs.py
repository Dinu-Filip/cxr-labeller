import pytest
from sqlalchemy.exc import IntegrityError

from models import SimilarityRating
from pairs import InvalidPairError, canonical, pair_id, parse_pair_id, unrated_pairs


def test_canonical_orders_both_directions_identically():
    assert canonical(2, 1) == canonical(1, 2) == (1, 2)


def test_canonical_rejects_self_pair():
    with pytest.raises(InvalidPairError):
        canonical(3, 3)


def test_pair_id_is_direction_independent():
    assert pair_id(9, 4) == pair_id(4, 9) == "4-9"


@pytest.mark.parametrize("value", ["", "5", "a-b", "1-2-3", "1-"])
def test_parse_pair_id_rejects_malformed(value):
    with pytest.raises(InvalidPairError):
        parse_pair_id(value)


def test_parse_pair_id_normalises():
    assert parse_pair_id("7-2") == (2, 7)


def test_database_rejects_non_canonical_pair(seeded):
    """The CHECK constraint is the last line of defence: even if application
    code forgot to normalise, (B,A) cannot be stored alongside (A,B)."""
    seeded.add(
        SimilarityRating(
            primitive_a_id=2, primitive_b_id=1, reviewer_id=1, level="clear"
        )
    )
    with pytest.raises(IntegrityError):
        seeded.commit()
    seeded.rollback()


def test_database_rejects_unknown_level(seeded):
    seeded.add(
        SimilarityRating(
            primitive_a_id=1, primitive_b_id=2, reviewer_id=1, level="somewhat"
        )
    )
    with pytest.raises(IntegrityError):
        seeded.commit()
    seeded.rollback()


def test_one_rating_per_reviewer_per_pair(seeded):
    seeded.add(
        SimilarityRating(
            primitive_a_id=1, primitive_b_id=2, reviewer_id=1, level="clear"
        )
    )
    seeded.commit()
    seeded.add(
        SimilarityRating(
            primitive_a_id=1, primitive_b_id=2, reviewer_id=1, level="weak"
        )
    )
    with pytest.raises(IntegrityError):
        seeded.commit()
    seeded.rollback()


def test_different_reviewers_may_rate_the_same_pair(seeded):
    seeded.add_all(
        [
            SimilarityRating(
                primitive_a_id=1, primitive_b_id=2, reviewer_id=1, level="clear"
            ),
            SimilarityRating(
                primitive_a_id=1, primitive_b_id=2, reviewer_id=2, level="none"
            ),
        ]
    )
    seeded.commit()


def test_unrated_pairs_covers_every_combination(seeded):
    pairs = unrated_pairs(seeded, reviewer_id=1, limit=100)
    assert len(pairs) == 6  # C(4,2)
    assert all(a.id < b.id for a, b in pairs)


def test_unrated_pairs_excludes_only_this_reviewers_ratings(seeded):
    seeded.add(
        SimilarityRating(
            primitive_a_id=1, primitive_b_id=2, reviewer_id=1, level="clear"
        )
    )
    seeded.commit()

    assert ("1-2") not in [
        pair_id(a.id, b.id) for a, b in unrated_pairs(seeded, 1, 100)
    ]
    assert ("1-2") in [pair_id(a.id, b.id) for a, b in unrated_pairs(seeded, 2, 100)]


def test_unrated_pairs_prefers_least_covered(seeded):
    # Bob rates everything except 3-4, so 3-4 is the only pair with no coverage
    # and must lead Alice's queue.
    for a, b in [(1, 2), (1, 3), (1, 4), (2, 3), (2, 4)]:
        seeded.add(
            SimilarityRating(
                primitive_a_id=a, primitive_b_id=b, reviewer_id=2, level="clear"
            )
        )
    seeded.commit()

    queue = [pair_id(a.id, b.id) for a, b in unrated_pairs(seeded, 1, 100)]
    assert queue[0] == "3-4"


def test_queue_orders_by_how_many_reviewers_covered_a_pair(seeded):
    # Three coverage tiers, so this fails if the sort key ever collapses to
    # "rated by somebody" instead of counting reviewers. Bob and Carol both rate
    # 1-4; they take one pair each; three pairs are left untouched.
    #
    # 1-4 is the twice-covered pair deliberately: it leads Alice's tiebreak hash,
    # so a sort key that stopped counting past one would pull it to the front of
    # the covered pairs rather than leaving it last, and the assertions below
    # would notice. Picking a late-hashing pair here would pass either way.
    for reviewer_id, pairs in [(2, [(1, 4), (1, 2)]), (3, [(1, 4), (1, 3)])]:
        for a, b in pairs:
            seeded.add(
                SimilarityRating(
                    primitive_a_id=a,
                    primitive_b_id=b,
                    reviewer_id=reviewer_id,
                    level="clear",
                )
            )
    seeded.commit()

    queue = [pair_id(a.id, b.id) for a, b in unrated_pairs(seeded, 1, 100)]

    # Alice has rated nothing, so every pair is still offered to her — coverage
    # only reorders the queue, it never removes work.
    assert len(queue) == 6
    assert set(queue[:3]) == {"2-3", "2-4", "3-4"}  # covered by nobody
    assert set(queue[3:5]) == {"1-2", "1-3"}  # covered once
    assert queue[5] == "1-4"  # covered twice


def test_queue_order_is_stable_but_reviewer_specific(seeded):
    alice_queue = [pair_id(a.id, b.id) for a, b in unrated_pairs(seeded, 1, 100)]
    again = [pair_id(a.id, b.id) for a, b in unrated_pairs(seeded, 1, 100)]
    bob_queue = [pair_id(a.id, b.id) for a, b in unrated_pairs(seeded, 2, 100)]

    assert alice_queue == again
    assert sorted(alice_queue) == sorted(bob_queue)
    assert alice_queue != bob_queue

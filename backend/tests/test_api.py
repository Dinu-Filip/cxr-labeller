from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from models import Reviewer, SimilarityRating


def test_health_needs_no_auth(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_endpoints_reject_missing_token(client):
    for method, path in [
        ("get", "/me"),
        ("get", "/primitives"),
        ("get", "/pairs"),
        ("get", "/ratings"),
    ]:
        assert getattr(client, method)(path).status_code == 401


def test_endpoints_reject_wrong_token(client):
    headers = {"Authorization": "Bearer not-a-real-token"}
    assert client.get("/me", headers=headers).status_code == 401


def test_revoked_token_is_rejected(client, seeded, alice):
    reviewer = seeded.scalar(select(Reviewer).where(Reviewer.name == "alice"))
    reviewer.revoked_at = datetime.now(timezone.utc)
    seeded.commit()
    assert client.get("/me", headers=alice).status_code == 401


def test_expired_token_is_rejected(client, seeded, alice):
    reviewer = seeded.scalar(select(Reviewer).where(Reviewer.name == "alice"))
    reviewer.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    seeded.commit()
    assert client.get("/me", headers=alice).status_code == 401


def test_unexpired_token_is_accepted(client, seeded, alice):
    reviewer = seeded.scalar(select(Reviewer).where(Reviewer.name == "alice"))
    reviewer.expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    seeded.commit()
    assert client.get("/me", headers=alice).status_code == 200


def test_me_reports_progress(client, alice):
    body = client.get("/me", headers=alice).json()
    assert body["name"] == "alice"
    assert body["total_pairs"] == 6  # C(4,2)
    assert body["rated"] == 0
    assert body["remaining"] == 6

    client.put("/ratings/1-2", json={"level": "clear"}, headers=alice)
    body = client.get("/me", headers=alice).json()
    assert (body["rated"], body["remaining"]) == (1, 5)


def test_pairs_shape_matches_frontend_contract(client, alice):
    pairs = client.get("/pairs?limit=2", headers=alice).json()
    assert len(pairs) == 2
    first = pairs[0]
    assert set(first) == {"id", "a", "b"}
    assert first["id"] == f"{first['a']['id']}-{first['b']['id']}"
    assert set(first["a"]) == {"id", "name", "description"}


def test_pairs_limit_is_bounded(client, alice):
    assert client.get("/pairs?limit=0", headers=alice).status_code == 422
    assert client.get("/pairs?limit=10001", headers=alice).status_code == 422


def test_rating_is_created_then_updated_in_place(client, seeded, alice):
    created = client.put("/ratings/1-2", json={"level": "clear"}, headers=alice)
    assert created.status_code == 200
    assert created.json()["level"] == "clear"

    updated = client.put("/ratings/1-2", json={"level": "weak"}, headers=alice)
    assert updated.status_code == 200
    assert updated.json()["level"] == "weak"

    rows = seeded.scalars(select(SimilarityRating)).all()
    assert len(rows) == 1


def test_rating_accepts_reversed_pair_id(client, seeded, alice):
    client.put("/ratings/2-1", json={"level": "moderate"}, headers=alice)
    row = seeded.scalars(select(SimilarityRating)).one()
    assert (row.primitive_a_id, row.primitive_b_id) == (1, 2)
    assert client.get("/ratings", headers=alice).json()[0]["pair_id"] == "1-2"


def test_reversed_pair_id_updates_the_same_row(client, seeded, alice):
    client.put("/ratings/1-2", json={"level": "clear"}, headers=alice)
    client.put("/ratings/2-1", json={"level": "none"}, headers=alice)
    rows = seeded.scalars(select(SimilarityRating)).all()
    assert len(rows) == 1
    assert rows[0].level == "none"


def test_rating_rejects_invalid_level(client, alice):
    assert (
        client.put(
            "/ratings/1-2", json={"level": "somewhat"}, headers=alice
        ).status_code
        == 422
    )


def test_rating_rejects_self_pair_and_malformed_id(client, alice):
    assert (
        client.put("/ratings/1-1", json={"level": "clear"}, headers=alice).status_code
        == 400
    )
    assert (
        client.put("/ratings/x-y", json={"level": "clear"}, headers=alice).status_code
        == 400
    )


def test_rating_rejects_unknown_primitive(client, alice):
    assert (
        client.put("/ratings/1-99", json={"level": "clear"}, headers=alice).status_code
        == 404
    )


def test_ratings_are_scoped_per_reviewer(client, alice, bob):
    client.put("/ratings/1-2", json={"level": "clear"}, headers=alice)
    client.put("/ratings/1-2", json={"level": "none"}, headers=bob)

    assert client.get("/ratings", headers=alice).json()[0]["level"] == "clear"
    assert client.get("/ratings", headers=bob).json()[0]["level"] == "none"


def test_delete_clears_only_the_current_reviewers_rating(client, alice, bob):
    client.put("/ratings/1-2", json={"level": "clear"}, headers=alice)
    client.put("/ratings/1-2", json={"level": "none"}, headers=bob)

    assert client.delete("/ratings/1-2", headers=alice).status_code == 204
    assert client.get("/ratings", headers=alice).json() == []
    assert len(client.get("/ratings", headers=bob).json()) == 1


def test_three_reviewers_rate_the_same_pair_independently(client, alice, bob, carol):
    levels = {"alice": "clear", "bob": "moderate", "carol": "none"}
    for headers, name in [(alice, "alice"), (bob, "bob"), (carol, "carol")]:
        assert (
            client.put(
                "/ratings/1-2", json={"level": levels[name]}, headers=headers
            ).status_code
            == 200
        )

    for headers, name in [(alice, "alice"), (bob, "bob"), (carol, "carol")]:
        mine = client.get("/ratings", headers=headers).json()
        assert [(row["pair_id"], row["level"]) for row in mine] == [
            ("1-2", levels[name])
        ]

    # One reviewer withdrawing leaves the other two intact, not just the one.
    assert client.delete("/ratings/1-2", headers=bob).status_code == 204
    assert client.get("/ratings", headers=bob).json() == []
    assert client.get("/ratings", headers=alice).json()[0]["level"] == "clear"
    assert client.get("/ratings", headers=carol).json()[0]["level"] == "none"

    rows = client.get(
        "/export", headers={"Authorization": "Bearer test-admin-token"}
    ).json()
    assert {(row["reviewer_name"], row["level"]) for row in rows} == {
        ("alice", "clear"),
        ("carol", "none"),
    }


def test_me_counts_ignore_other_reviewers_writes(client, alice, bob, carol):
    for headers in (bob, carol):
        for raw_pair_id in ("1-2", "1-3", "1-4"):
            client.put(
                f"/ratings/{raw_pair_id}", json={"level": "clear"}, headers=headers
            )

    def progress(headers):
        body = client.get("/me", headers=headers).json()
        return body["rated"], body["remaining"], body["total_pairs"]

    # Six pairs rated between the two of them, none of them Alice's.
    assert progress(alice) == (0, 6, 6)

    client.put("/ratings/1-2", json={"level": "weak"}, headers=alice)
    assert progress(alice) == (1, 5, 6)
    assert progress(bob) == (3, 3, 6)

    client.delete("/ratings/1-2", headers=carol)
    assert progress(alice) == (1, 5, 6)
    assert progress(carol) == (2, 4, 6)


def test_delete_missing_rating_is_404(client, alice):
    assert client.delete("/ratings/1-2", headers=alice).status_code == 404


def test_rated_pair_leaves_the_queue_and_returns_after_delete(client, alice):
    def queue():
        return [pair["id"] for pair in client.get("/pairs", headers=alice).json()]

    assert "1-2" in queue()
    client.put("/ratings/1-2", json={"level": "clear"}, headers=alice)
    assert "1-2" not in queue()
    client.delete("/ratings/1-2", headers=alice)
    assert "1-2" in queue()


def test_batch_upserts_and_dedupes(client, seeded, alice):
    response = client.post(
        "/ratings/batch",
        json=[
            {"pair_id": "1-2", "level": "clear"},
            {"pair_id": "3-4", "level": "weak"},
            {"pair_id": "2-1", "level": "none"},  # same pair as the first, later wins
        ],
        headers=alice,
    )
    assert response.status_code == 200
    levels = {row["pair_id"]: row["level"] for row in response.json()}
    assert levels == {"1-2": "none", "3-4": "weak"}
    assert len(seeded.scalars(select(SimilarityRating)).all()) == 2


def test_batch_rejects_unknown_primitive_atomically(client, seeded, alice):
    response = client.post(
        "/ratings/batch",
        json=[
            {"pair_id": "1-2", "level": "clear"},
            {"pair_id": "1-99", "level": "clear"},
        ],
        headers=alice,
    )
    assert response.status_code == 404
    assert seeded.scalars(select(SimilarityRating)).all() == []


def test_export_requires_the_admin_token(client, alice):
    assert client.get("/export").status_code == 401
    assert client.get("/export", headers=alice).status_code == 401


def test_export_returns_every_reviewers_ratings(client, alice, bob):
    client.put("/ratings/1-2", json={"level": "clear"}, headers=alice)
    client.put("/ratings/1-2", json={"level": "none"}, headers=bob)

    rows = client.get(
        "/export", headers={"Authorization": "Bearer test-admin-token"}
    ).json()
    assert len(rows) == 2
    assert {row["reviewer_name"] for row in rows} == {"alice", "bob"}

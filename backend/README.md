# primitive-scorer backend

FastAPI backend for pairwise similarity rating of structural radiological
primitives. Reviewers are identified by a bearer token; each reviewer records at
most one rating per primitive pair.

## Schema

- `primitives` — the list of primitives being compared.
- `reviewers` — one row per rater, holding the sha256 of its bearer token.
- `similarity_ratings` — one rating per (pair, reviewer).

Similarity is symmetric, so a pair has exactly one canonical representation,
enforced by `CHECK (primitive_a_id < primitive_b_id)`. The API normalises either
direction onto it, and a pair's public id is `"{low}-{high}"`.

## Dev

```sh
uv sync
uv run alembic upgrade head    # defaults to sqlite ./dev.db
uv run python seed.py
uv run python issue_token.py issue --name "your name"
uv run fastapi dev main.py
```

Serves on `http://127.0.0.1:8000`, with API docs at `/docs`.

Every endpoint except `/health` needs `Authorization: Bearer <token>`.

### Reviewer tokens

```sh
uv run python issue_token.py issue --name alice [--expires-days 90]
uv run python issue_token.py list
uv run python issue_token.py revoke --name alice
```

The token is printed once at issue time; only its hash is stored, so a lost
token has to be reissued.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Full connection URL. Falls back to `DB_*` parts, then `sqlite:///./dev.db`. |
| `DB_PASSWORD`, `DB_HOST`, `DB_USER`, `DB_NAME`, `DB_PORT` | Discrete Postgres settings, used when `DATABASE_URL` is unset. |
| `ADMIN_TOKEN` | Enables `GET /export`. Unset means the endpoint returns 404. |
| `CORS_ORIGINS` | Comma-separated allowed origins. Defaults cover local dev and Tauri. |

## Endpoints

| Method | Path | |
| --- | --- | --- |
| `GET` | `/health` | no auth |
| `GET` | `/me` | identity and progress |
| `GET` | `/primitives` | the primitive list |
| `GET` | `/pairs?limit=50` | next unrated pairs, least-covered first |
| `GET` | `/ratings` | this reviewer's ratings |
| `PUT` | `/ratings/{a}-{b}` | upsert a rating |
| `DELETE` | `/ratings/{a}-{b}` | clear a rating |
| `POST` | `/ratings/batch` | flush queued offline ratings |
| `GET` | `/export` | every reviewer's ratings; needs `ADMIN_TOKEN` |

## Tests

```sh
uv run pytest
```

Runs against a temporary SQLite file. SQLite enforces the `CHECK` constraints
natively, so the canonical-pair and level guards are covered as written.

## Hosting

```sh
uv sync --no-dev
uv run alembic upgrade head
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

The Docker image runs `alembic upgrade head` before starting uvicorn, so a
deploy cannot serve a schema it predates. Put a reverse proxy in front for TLS.

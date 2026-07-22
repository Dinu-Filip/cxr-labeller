# cxr-labeller backend

FastAPI backend for the labelling tool, using SQLAlchemy models for scans and their labeled bounding regions.

## Dev

Runs fully locally against a throwaway SQLite database — no network calls to the hosted Supabase instance, safe to reset any time.

```sh
uv sync
set -a && source .env.local && set +a   # DATABASE_URL + SECRET_KEY for local dev
uv run python -m src.create_db            # creates ./dev.db and its tables
uv run fastapi dev src/main.py
```

Serves on `http://127.0.0.1:8000` with auto-reload. Delete `dev.db` and rerun `python -m src.create_db` any time to reset to an empty database.

To instead run against the real Supabase database, `source .env` (production `DB_*` vars + `SECRET_KEY`) before the `create_db`/`fastapi dev` steps.

## Hosting

Run with `uvicorn` directly, binding to all interfaces and dropping `--reload`:

```sh
uv sync --no-dev
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Put a reverse proxy (nginx, Caddy, etc.) in front for TLS. Interactive API docs are served at `/docs` (Swagger UI) and `/redoc`.

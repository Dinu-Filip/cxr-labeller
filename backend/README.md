# cxr-labeller backend

FastAPI backend for the labelling tool, using SQLAlchemy models for scans and their labeled bounding regions.

## Dev

```sh
uv sync
uv run fastapi dev main.py
```

Serves on `http://127.0.0.1:8000` with auto-reload.

## Hosting

Run with `uvicorn` directly, binding to all interfaces and dropping `--reload`:

```sh
uv sync --no-dev
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Put a reverse proxy (nginx, Caddy, etc.) in front for TLS. Interactive API docs are served at `/docs` (Swagger UI) and `/redoc`.

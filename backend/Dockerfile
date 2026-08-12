FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

# Install dependencies first so this layer is cached across source changes
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY config.py db.py models.py schemas.py auth.py pairs.py main.py ./
COPY seed.py issue_token.py ./
COPY alembic.ini ./
COPY alembic ./alembic
RUN uv sync --frozen --no-dev

EXPOSE 8000
# Migrations run at start-up so a deploy cannot serve a schema it predates.
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn main:app --host 0.0.0.0 --port 8000"]

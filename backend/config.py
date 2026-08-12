import os


def database_url() -> str:
    """
    Resolution order: an explicit DATABASE_URL, then the discrete DB_* parts
    (how the Supabase instance is configured), then a local SQLite file.
    """
    url = os.environ.get("DATABASE_URL")
    if url:
        # SQLAlchemy needs an explicit driver; Supabase hands out bare
        # postgres:// or postgresql:// URLs.
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    password = os.environ.get("DB_PASSWORD")
    host = os.environ.get("DB_HOST")
    if password and host:
        from sqlalchemy import URL

        return URL.create(
            "postgresql+psycopg",
            username=os.environ.get("DB_USER", "postgres"),
            password=password,
            host=host,
            port=int(os.environ.get("DB_PORT", "5432")),
            database=os.environ.get("DB_NAME", "postgres"),
        ).render_as_string(hide_password=False)

    return "sqlite+pysqlite:///./dev.db"


def admin_token() -> str | None:
    """When unset, the export endpoint is disabled rather than left open."""
    return os.environ.get("ADMIN_TOKEN") or None


def cors_origins() -> list[str]:
    configured = os.environ.get("CORS_ORIGINS")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        "http://localhost:1420",  # tauri dev / vite dev
        "http://localhost:5173",  # vite dev, default port
        "http://localhost:4173",  # vite preview
        # Packaged Tauri builds do not use an http origin.
        "tauri://localhost",
        "http://tauri.localhost",
    ]

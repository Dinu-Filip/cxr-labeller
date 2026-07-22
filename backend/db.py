import os
import sys
from functools import lru_cache

from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


def _get_env_var(name: str) -> str:
    var = os.environ.get(name)
    if not var:
        print(f"{name} environment variable is not set", file=sys.stderr)
        sys.exit(1)
    return var


@lru_cache
def get_engine():
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return create_engine(database_url)

    url = URL.create(
        "postgresql+psycopg",
        username=_get_env_var("DB_USER"),
        password=_get_env_var("DB_PASSWORD"),
        host=_get_env_var("DB_HOST"),
        port=int(_get_env_var("DB_PORT")),
        database=_get_env_var("DB_NAME"),
    )
    return create_engine(url)


def get_db():
    session = sessionmaker(bind=get_engine())()
    try:
        yield session
    finally:
        session.close()

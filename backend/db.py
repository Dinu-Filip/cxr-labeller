from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import database_url


class Base(DeclarativeBase):
    pass


_url = database_url()
_connect_args = {"check_same_thread": False} if _url.startswith("sqlite") else {}

engine = create_engine(_url, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

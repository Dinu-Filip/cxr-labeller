import os
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

# A file rather than :memory: — an in-memory SQLite database is per-connection,
# so TestClient's worker thread would otherwise see an empty schema.
_DB_FILE = Path(tempfile.gettempdir()) / "cxr-labeller-test.db"
_DB_FILE.unlink(missing_ok=True)

# Both must be set before db.py builds its engine at import time.
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{_DB_FILE}"
os.environ["ADMIN_TOKEN"] = "test-admin-token"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import event  # noqa: E402

import db as db_module  # noqa: E402
from auth import hash_token  # noqa: E402
from db import Base, engine  # noqa: E402
from main import app  # noqa: E402
from models import Primitive, Reviewer  # noqa: E402


@event.listens_for(engine, "connect")
def _enforce_sqlite_constraints(dbapi_connection, _record):
    """SQLite ignores foreign keys unless asked. CHECK constraints are enforced
    natively, which is what makes the canonical-pair guard testable here."""
    dbapi_connection.execute("PRAGMA foreign_keys=ON")


@pytest.fixture
def session():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with db_module.SessionLocal() as db:
        yield db


@pytest.fixture
def seeded(session):
    session.add_all(
        [
            Primitive(id=1, name="Consolidation"),
            Primitive(id=2, name="Ground-glass opacity"),
            Primitive(id=3, name="Nodule"),
            Primitive(id=4, name="Mass"),
        ]
    )
    session.add_all(
        [
            Reviewer(id=1, name="alice", token_hash=hash_token("alice-token")),
            Reviewer(id=2, name="bob", token_hash=hash_token("bob-token")),
            Reviewer(id=3, name="carol", token_hash=hash_token("carol-token")),
        ]
    )
    session.commit()
    return session


@pytest.fixture
def client(seeded):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def alice():
    return {"Authorization": "Bearer alice-token"}


@pytest.fixture
def bob():
    return {"Authorization": "Bearer bob-token"}


@pytest.fixture
def carol():
    return {"Authorization": "Bearer carol-token"}

import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from config import admin_token
from db import get_db
from models import Reviewer

bearer = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="invalid or missing bearer token",
    headers={"WWW-Authenticate": "Bearer"},
)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_token() -> str:
    return secrets.token_urlsafe(32)


def _as_utc(value: datetime) -> datetime:
    """SQLite hands back naive datetimes; treat those as UTC."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def current_reviewer(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Reviewer:
    if credentials is None or not credentials.credentials:
        raise _UNAUTHORIZED

    digest = hash_token(credentials.credentials)
    reviewer = db.scalar(select(Reviewer).where(Reviewer.token_hash == digest))
    if reviewer is None:
        raise _UNAUTHORIZED
    if not secrets.compare_digest(reviewer.token_hash, digest):
        raise _UNAUTHORIZED
    if reviewer.revoked_at is not None:
        raise _UNAUTHORIZED
    if reviewer.expires_at is not None and _as_utc(reviewer.expires_at) <= datetime.now(
        timezone.utc
    ):
        raise _UNAUTHORIZED
    return reviewer


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> None:
    """
    The approved schema has no admin role, so export is gated on a separate
    ADMIN_TOKEN from the environment. Unset means the endpoint is absent
    entirely rather than open to any reviewer.
    """
    configured = admin_token()
    if configured is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if credentials is None or not secrets.compare_digest(
        credentials.credentials, configured
    ):
        raise _UNAUTHORIZED

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from db import Base

SIMILARITY_LEVELS = ("clear", "moderate", "weak", "none")

_LEVEL_LIST = ", ".join(f"'{level}'" for level in SIMILARITY_LEVELS)

# SQLite has no distinct BIGINT autoincrement; plain INTEGER is its rowid alias.
_BigIntPK = BigInteger().with_variant(Integer, "sqlite")


class Primitive(Base):
    __tablename__ = "primitives"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    description: Mapped[str | None] = mapped_column(Text)


class Reviewer(Base):
    __tablename__ = "reviewers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    # sha256 hex digest of the bearer token; the token itself is never stored.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SimilarityRating(Base):
    __tablename__ = "similarity_ratings"

    id: Mapped[int] = mapped_column(_BigIntPK, primary_key=True)
    primitive_a_id: Mapped[int] = mapped_column(ForeignKey("primitives.id"))
    primitive_b_id: Mapped[int] = mapped_column(ForeignKey("primitives.id"))
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("reviewers.id"))
    level: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        # Similarity is symmetric, so a pair has exactly one canonical
        # representation. Without this, (A,B) and (B,A) could both be stored
        # with contradicting levels and the unique constraint would not notice.
        CheckConstraint("primitive_a_id < primitive_b_id", name="pair_is_canonical"),
        CheckConstraint(f"level IN ({_LEVEL_LIST})", name="level_is_valid"),
        UniqueConstraint(
            "primitive_a_id",
            "primitive_b_id",
            "reviewer_id",
            name="one_rating_per_reviewer_per_pair",
        ),
        Index("ix_similarity_ratings_reviewer_id", "reviewer_id"),
        Index("ix_similarity_ratings_pair", "primitive_a_id", "primitive_b_id"),
    )

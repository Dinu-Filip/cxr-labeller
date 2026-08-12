"""initial similarity-rating schema

Supersedes the scans / bounding-region design; those tables are dropped if a
database still carries them.

Revision ID: 0001
Revises:
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LEVELS = "'clear', 'moderate', 'weak', 'none'"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    # The superseded design, plus an orphaned users table that predates it.
    for table in ("scan_bounding_regions", "scans", "users"):
        if table in existing:
            op.drop_table(table)
    if "primitives" in existing:
        op.drop_table("primitives")

    op.create_table(
        "primitives",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
    )

    op.create_table(
        "reviewers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "similarity_ratings",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(sa.Integer(), "sqlite"),
            primary_key=True,
        ),
        sa.Column(
            "primitive_a_id",
            sa.Integer(),
            sa.ForeignKey("primitives.id"),
            nullable=False,
        ),
        sa.Column(
            "primitive_b_id",
            sa.Integer(),
            sa.ForeignKey("primitives.id"),
            nullable=False,
        ),
        sa.Column(
            "reviewer_id",
            sa.Integer(),
            sa.ForeignKey("reviewers.id"),
            nullable=False,
        ),
        sa.Column("level", sa.String(16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("primitive_a_id < primitive_b_id", name="pair_is_canonical"),
        sa.CheckConstraint(f"level IN ({LEVELS})", name="level_is_valid"),
        sa.UniqueConstraint(
            "primitive_a_id",
            "primitive_b_id",
            "reviewer_id",
            name="one_rating_per_reviewer_per_pair",
        ),
    )
    op.create_index(
        "ix_similarity_ratings_reviewer_id", "similarity_ratings", ["reviewer_id"]
    )
    op.create_index(
        "ix_similarity_ratings_pair",
        "similarity_ratings",
        ["primitive_a_id", "primitive_b_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_similarity_ratings_pair", table_name="similarity_ratings")
    op.drop_index("ix_similarity_ratings_reviewer_id", table_name="similarity_ratings")
    op.drop_table("similarity_ratings")
    op.drop_table("reviewers")
    op.drop_table("primitives")

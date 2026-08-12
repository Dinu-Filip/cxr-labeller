from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SimilarityLevel = Literal["clear", "moderate", "weak", "none"]


class PrimitiveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None


class PairOut(BaseModel):
    id: str
    a: PrimitiveOut
    b: PrimitiveOut


class RatingIn(BaseModel):
    level: SimilarityLevel


class BatchRatingIn(BaseModel):
    pair_id: str
    level: SimilarityLevel


class RatingOut(BaseModel):
    pair_id: str
    primitive_a_id: int
    primitive_b_id: int
    level: SimilarityLevel
    created_at: datetime
    updated_at: datetime


class ExportRatingOut(RatingOut):
    reviewer_id: int
    reviewer_name: str


class MeOut(BaseModel):
    id: int
    name: str
    rated: int = Field(description="pairs this reviewer has rated")
    total_pairs: int = Field(description="pairs that exist across all primitives")
    remaining: int

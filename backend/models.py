from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from db import Base


class Scan(Base):
    __tablename__ = "scans"

    scan_id: Mapped[str] = mapped_column(primary_key=True)
    patient_id: Mapped[str] = mapped_column(index=True)
    timestamp: Mapped[datetime]


class Primitive(Base):
    __tablename__ = "primitives"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(index=True)
    description: Mapped[str]


class ScanBoundingRegion(Base):
    __tablename__ = "scan_bounding_regions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    scan_id: Mapped[str] = mapped_column(ForeignKey("scans.scan_id"), index=True)
    primitive_id: Mapped[int] = mapped_column(ForeignKey("primitives.id"), index=True)
    # Normalized box: {"x_min": 0.0-1.0, "y_min": 0.0-1.0, "x_max": 0.0-1.0, "y_max": 0.0-1.0}
    bounding_region: Mapped[dict] = mapped_column(JSON)
    comment: Mapped[Optional[str]]

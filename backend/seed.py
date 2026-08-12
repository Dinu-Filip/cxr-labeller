"""Seed the primitive list. Idempotent: existing names are left untouched."""

from sqlalchemy import select

from db import SessionLocal
from models import Primitive

PRIMITIVES: list[tuple[str, str]] = [
    ("Consolidation", "Homogeneous opacification of airspaces obscuring vessels."),
    ("Ground-glass opacity", "Hazy increased attenuation with vessels still visible."),
    ("Reticulation", "Network of fine linear opacities."),
    ("Nodule", "Rounded opacity up to 3 cm."),
    ("Mass", "Rounded opacity larger than 3 cm."),
    ("Cavitation", "Gas-filled space within an area of consolidation or a nodule."),
    ("Pleural effusion", "Fluid collection in the pleural space."),
    ("Pneumothorax", "Gas in the pleural space with a visible lung edge."),
    ("Atelectasis", "Volume loss with displacement of fissures or hila."),
    ("Honeycombing", "Clustered cystic airspaces with thick walls."),
    ("Interlobular septal thickening", "Thickened lines outlining secondary lobules."),
    ("Air bronchogram", "Air-filled bronchi rendered visible by surrounding opacity."),
]


def main() -> None:
    with SessionLocal() as db:
        existing = set(db.scalars(select(Primitive.name)).all())
        added = [
            Primitive(name=name, description=description)
            for name, description in PRIMITIVES
            if name not in existing
        ]
        db.add_all(added)
        db.commit()
        total = db.scalar(select(Primitive).order_by(Primitive.id.desc()))
        print(f"added {len(added)} primitive(s); {len(existing) + len(added)} total")
        if total is None:
            print("warning: primitive table is empty")


if __name__ == "__main__":
    main()

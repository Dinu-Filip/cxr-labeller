"""Seed the primitive list. Idempotent: existing names are left untouched."""

from sqlalchemy import select

from db import SessionLocal
from models import Primitive

# Order defines the heatmap axes and the default rating order, so it is grouped
# by territory: airspace, interstitial, nodular, airway, lucency/volume, pleura,
# vasculature, cardiac, mediastinum/hila, diaphragm and chest wall.
PRIMITIVES: list[str] = [
    "Consolidation",
    "Air bronchogram",
    "Airspace opacity (non-consolidative)",
    "Cavitation",
    "Reticular / linear opacity",
    "Kerley line",
    "Honeycombing",
    "Micronodular (miliary) pattern",
    "Pulmonary nodule / mass",
    "Calcification",
    "Bronchiectasis",
    "Peribronchial cuffing",
    "Increased lung lucency",
    "Bulla/cyst",
    "Volume loss",
    "Pleural line",
    "Pleural effusion",
    "Pleural thickening",
    "Vascular redistribution (cephalisation)",
    "Peripheral vascular pruning / oligemia",
    "Enlarged central pulmonary arteries",
    "Enlarged cardiac silhouette",
    "Narrow / small cardiac silhouette",
    "Left atrial enlargement",
    "Right atrial enlargement",
    "Right ventricular enlargement",
    "Water bottle sign",
    "Mediastinal widening",
    "Hilar nodal / mass enlargement",
    "Contralateral mediastinal shift",
    "Ipsilateral mediastinal shift",
    "Hilar retraction / elevation",
    "Flattened hemidiaphragm",
    "Elevated hemidiaphragm",
    "Widened intercostal spaces",
    "Crowded intercostal spaces",
]


def main() -> None:
    with SessionLocal() as db:
        existing = set(db.scalars(select(Primitive.name)).all())
        added = [Primitive(name=name) for name in PRIMITIVES if name not in existing]
        db.add_all(added)
        db.commit()
        total = db.scalar(select(Primitive).order_by(Primitive.id.desc()))
        print(f"added {len(added)} primitive(s); {len(existing) + len(added)} total")
        if total is None:
            print("warning: primitive table is empty")


if __name__ == "__main__":
    main()

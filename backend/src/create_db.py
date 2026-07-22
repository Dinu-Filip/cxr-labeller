from src.db import Base, get_engine
import src.annotations.models  # registers Scan/Primitive/ScanBoundingRegion on Base.metadata  # noqa: F401
import src.auth.models  # registers User on Base.metadata  # noqa: F401


def main() -> None:
    engine = get_engine()
    Base.metadata.create_all(engine)
    print(f"Created tables: {', '.join(Base.metadata.tables)}")


if __name__ == "__main__":
    main()

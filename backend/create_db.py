import os
import sys

from sqlalchemy import URL, create_engine

from db import Base
import models  # registers Scan/Primitive/ScanBoundingRegion on Base.metadata  # noqa: F401

def _get_env_var(name: str) -> str:
    var = os.environ.get(name)
    if not var:
        print(f"{name} environment variable is not set", file=sys.stderr)
        sys.exit(1)
    
    return var

def main() -> None:
    password = _get_env_var("DB_PASSWORD")
    host = _get_env_var("DB_HOST")
    port = int(_get_env_var("DB_PORT"))
    user = _get_env_var("DB_USER")
    name = _get_env_var("DB_NAME")

    url = URL.create(
        "postgresql+psycopg",
        username=user,
        password=password,
        host=host,
        port=port,
        database=name,
    )

    engine = create_engine(url)
    Base.metadata.create_all(engine)
    print(f"Created tables: {', '.join(Base.metadata.tables)}")


if __name__ == "__main__":
    main()

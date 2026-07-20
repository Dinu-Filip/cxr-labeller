import os
import sys

from sqlalchemy import URL, create_engine

from db import Base
import models  # noqa: registers Scan/Primitive/ScanBoundingRegion on Base.metadata

DB_PORT = 5432
DB_USER = "postgres.hmyivgskkxftasobwwac"
DB_NAME = "postgres"

def _get_env_var(name: str) -> str:
    var = os.environ.get(name)
    if not var:
        print(f"{name} environment variable is not set", file=sys.stderr)
        sys.exit(1)
    
    return var

def main() -> None:
    password = _get_env_var("DB_PASSWORD")
    host = _get_env_var("DB_HOST")

    url = URL.create(
        "postgresql+psycopg",
        username=DB_USER,
        password=password,
        host=host,
        port=DB_PORT,
        database=DB_NAME,
    )

    engine = create_engine(url)
    Base.metadata.create_all(engine)
    print(f"Created tables: {', '.join(Base.metadata.tables)}")


if __name__ == "__main__":
    main()

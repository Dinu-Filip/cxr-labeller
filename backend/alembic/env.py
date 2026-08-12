from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from config import database_url
from db import Base
import models  # noqa: F401  registers the tables on Base.metadata

config = context.config

# The URL deliberately does not go through config.set_main_option(): that writes
# into alembic.ini's configparser, whose interpolation reads "%" as an escape, so
# a percent-encoded character in the password (%21 for "!") aborts the migration
# with "invalid interpolation syntax". Handing the URL straight to create_engine
# skips the ini layer and the escaping question with it.

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(database_url(), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Needed for SQLite, which cannot ALTER most constraints in place.
            render_as_batch=connection.dialect.name == "sqlite",
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

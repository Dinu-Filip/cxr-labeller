from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(unique=True, index=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    # Hashed (e.g. via bcrypt/argon2), never store a raw password
    password_hash: Mapped[str]

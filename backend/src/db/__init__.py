from __future__ import annotations

from typing import Generator

from src.db.base import Base
from src.db.models import Message, User
from src.db.session import SessionLocal, engine


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

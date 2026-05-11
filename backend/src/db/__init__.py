from __future__ import annotations

from typing import Generator

from backend.src.db.base import Base
from backend.src.db.models import Message, User
from backend.src.db.session import SessionLocal, engine


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

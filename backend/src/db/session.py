from __future__ import annotations
from sqlalchemy import create_engine # type: ignore
from sqlalchemy.orm import sessionmaker # type: ignore
from src.core.config import settings

# For Postgres, we usually don't need specific connect_args 
# unless you are using a cloud provider like Supabase or AWS RDS that requires SSL.
# connect_args: dict[str, object] = {}

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # This is the "Magic Fix" - it checks if the connection is alive
    pool_recycle=300,        # Reset connections every 5 minutes (Postgres likes this)
    pool_size=5,             # Standard pool size
    max_overflow=10          # Allow some extra room
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
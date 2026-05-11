from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
import os

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")


def _split_csv(value: str | None, default: list[str]) -> list[str]:
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Robert")
    api_prefix: str = os.getenv("API_PREFIX", "/api")
    secret_key: str = os.getenv("SECRET_KEY", "CHANGE_ME_REPLACE")
    algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./chat.db")
    model_server_url: str | None = os.getenv("MODEL_SERVER_URL")
    cors_origins: list[str] = field(
        default_factory=lambda: _split_csv(
            os.getenv("CORS_ORIGINS"),
            ["http://localhost:4200", "http://127.0.0.1:4200"],
        )
    )
    frontend_build_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "frontend" / "dist" / "frontend" / "browser")
    frontend_source_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "frontend")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

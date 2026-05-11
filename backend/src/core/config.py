from pydantic_settings import BaseSettings, SettingsConfigDict # type: ignore


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    DATABASE_URL: str
    MODEL_NAME: str
    CORS_ORIGINS: list[str] = ["*"]

    api_prefix: str = "/api/v1"
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7



settings = Settings()




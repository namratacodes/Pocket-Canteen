from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    ml_database_url: str = ""
    seed_database_url: str = ""
    jwt_access_secret: str = "dev-access-secret-change-me-32chars"
    cors_origins: str = "http://localhost:5173"
    campus_tz: str = "Asia/Kolkata"
    data_source: str = "postgres"
    parquet_dir: str = "data/synthetic"
    artifact_dir: str = "artifacts"
    velocity_refresh_seconds: int = 30
    nightly_hour: int = 2
    nightly_minute: int = 30
    retrain_window_days: int = 28
    retrain_mae_threshold_seconds: int = 150


@lru_cache
def get_settings() -> Settings:
    return Settings()

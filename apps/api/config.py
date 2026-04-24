import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    _base_dir = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    DATABASE_URL: str = f"sqlite:///{os.path.join(_base_dir, 'forgesentinel.db')}"
    REAL_SCAN_ENABLED: bool = False
    SCAN_ALLOWED_CIDRS: str = "192.168.0.0/16,10.0.0.0/8,172.16.0.0/12"
    AETHER_API_BASE_URL: str = ""
    AETHER_API_TOKEN: str = ""
    AETHER_ENABLED: bool = False
    API_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3005,http://localhost:3000"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

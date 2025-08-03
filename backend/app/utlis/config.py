from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Time Management Dashboard"

    # CORS settings
    BACKEND_CORS_ORIGINS: list = ["http://127.0.0.1:5000", "http://127.0.0.1:5173",
                                  "http://127.0.0.1:3000", "http://localhost:5000", "http://localhost:5173", "http://localhost:3000"]

    # File storage paths
    DATA_DIR: str = "data"
    TASKS_FILE: str = "data/tasks.json"
    WEEKLY_TASKS_FILE: str = "data/weekly_tasks.json"
    SETTINGS_FILE: str = "data/settings.json"

    # Obsidian integration
    OBSIDIAN_VAULT_PATH: Optional[str] = None
    AUTO_SYNC_ENABLED: bool = False

    # TickTick integration
    TICKTICK_ENABLED: bool = False
    TICKTICK_ACCESS_TOKEN: Optional[str] = None

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()

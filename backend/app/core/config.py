from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Time Management Dashboard"

    # CORS settings
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]

    # File storage paths
    DATA_DIR: str = "data"
    TASKS_FILE: str = "data/tasks.json"
    WEEKLY_TASKS_FILE: str = "data/weekly_tasks.json"
    SETTINGS_FILE: str = "data/settings.json"

    # Obsidian integration
    OBSIDIAN_VAULT_PATH: Optional[str] = None
    AUTO_SYNC_ENABLED: bool = False

    # TickTick integration
    TICKTICK_USERNAME: Optional[str] = None
    TICKTICK_PASSWORD: Optional[str] = None
    TICKTICK_ENABLED: bool = True

    # TickTick OAuth2 settings
    TICKTICK_CLIENT_ID: Optional[str] = None
    TICKTICK_CLIENT_SECRET: Optional[str] = None
    TICKTICK_REDIRECT_URI: Optional[str] = None
    TICKTICK_ACCESS_TOKEN: Optional[str] = "tp_931ece844c144b4eb66cfcf2ecf154b6"
    TICKTICK_REFRESH_TOKEN: Optional[str] = None

    # WebSocket settings
    WS_HEARTBEAT_INTERVAL: int = 30

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()

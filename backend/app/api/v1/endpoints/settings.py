from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
import json
from pathlib import Path

router = APIRouter()

class TickTickSettings(BaseModel):
    enabled: bool = False
    access_token: Optional[str] = None
    default_project_id: Optional[str] = None
    username: Optional[str] = None

class AppSettings(BaseModel):
    ticktick: TickTickSettings = TickTickSettings()

SETTINGS_FILE = Path("data/app_settings.json")

def load_settings() -> AppSettings:
    """Load application settings from file"""
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                data = json.load(f)
                return AppSettings(**data)
        return AppSettings()
    except Exception:
        return AppSettings()

def save_settings(settings: AppSettings) -> bool:
    """Save application settings to file"""
    try:
        # Ensure data directory exists
        SETTINGS_FILE.parent.mkdir(exist_ok=True)
        
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings.model_dump(), f, indent=2)
        return True
    except Exception:
        return False

@router.get("/", response_model=AppSettings)
async def get_settings():
    """Get current application settings"""
    return load_settings()

@router.put("/ticktick", response_model=TickTickSettings)
async def update_ticktick_settings(settings: TickTickSettings):
    """Update TickTick integration settings"""
    try:
        app_settings = load_settings()
        app_settings.ticktick = settings
        
        if save_settings(app_settings):
            return settings
        else:
            raise HTTPException(status_code=500, detail="Failed to save settings")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ticktick", response_model=TickTickSettings)
async def get_ticktick_settings():
    """Get TickTick integration settings (without exposing access token)"""
    settings = load_settings()
    # Don't expose the actual access token, just indicate if it's set
    result = TickTickSettings(
        enabled=settings.ticktick.enabled,
        access_token="***" if settings.ticktick.access_token else None,
        default_project_id=settings.ticktick.default_project_id,
        username=settings.ticktick.username
    )
    return result

@router.delete("/ticktick")
async def clear_ticktick_settings():
    """Clear TickTick integration settings"""
    try:
        app_settings = load_settings()
        app_settings.ticktick = TickTickSettings()
        
        if save_settings(app_settings):
            return {"message": "TickTick settings cleared successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to clear settings")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
from fastapi import APIRouter

from app.api.v1.endpoints import tasks, obsidian, ticktick, settings

api_router = APIRouter()

api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(obsidian.router, prefix="/obsidian", tags=["obsidian"])
api_router.include_router(ticktick.router, prefix="/ticktick", tags=["ticktick"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
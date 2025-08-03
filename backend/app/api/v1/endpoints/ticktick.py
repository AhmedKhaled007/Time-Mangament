from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.services.ticktick_service import ticktick_service
from app.services.task_service import task_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class TickTickSettings(BaseModel):
    access_token: str
    enabled: bool = True
    default_project_id: Optional[str] = None

class TickTickTestRequest(BaseModel):
    access_token: str

class TickTickSyncRequest(BaseModel):
    access_token: str
    project_id: Optional[str] = None
    sync_direction: str = "both"  # "import", "export", "both"

@router.post("/test-connection")
async def test_ticktick_connection(request: TickTickTestRequest):
    """Test connection to TickTick API with provided access token"""
    try:
        result = await ticktick_service.test_connection(request.access_token)
        return result
    except Exception as e:
        logger.error(f"TickTick test connection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects")
async def get_ticktick_projects():
    """Get all projects from TickTick"""
    try:
        projects = await ticktick_service.get_projects()
        return {"projects": projects}
    except Exception as e:
        logger.error(f"Error fetching TickTick projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks")
async def get_ticktick_tasks(project_id: Optional[str] = None):
    """Get tasks from TickTick, optionally filtered by project"""
    try:
        tasks = await ticktick_service.get_tasks(project_id=project_id)
        return tasks if tasks else {"tasks": []}
    except Exception as e:
        logger.error(f"Error fetching TickTick tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_with_ticktick(request: TickTickSyncRequest):
    """Sync tasks between local storage and TickTick"""
    try:
        result = {
            "imported": 0,
            "exported": 0,
            "errors": [],
            "success": True
        }
        
        # Import from TickTick to local
        if request.sync_direction in ["import", "both"]:
            try:
                ticktick_response = await ticktick_service.get_tasks(
                    project_id=request.project_id
                )
                ticktick_tasks = ticktick_response.get("tasks", []) if ticktick_response else []
                
                for tt_task in ticktick_tasks:
                    try:
                        local_task = ticktick_service.convert_ticktick_to_local_task(tt_task)
                        created_task = task_service.create_task(local_task)
                        if created_task:
                            result["imported"] += 1
                    except Exception as e:
                        result["errors"].append(f"Failed to import task '{tt_task.get('title', 'Unknown')}': {str(e)}")
                        
            except Exception as e:
                result["errors"].append(f"Failed to fetch TickTick tasks: {str(e)}")
        
        # Export from local to TickTick
        if request.sync_direction in ["export", "both"]:
            try:
                local_tasks = task_service.get_all_tasks()
                
                for task in local_tasks:
                    try:
                        created_tt_task = await ticktick_service.create_task(task)
                        if created_tt_task:
                            result["exported"] += 1
                    except Exception as e:
                        result["errors"].append(f"Failed to export task '{task.text}': {str(e)}")
                        
            except Exception as e:
                result["errors"].append(f"Failed to fetch local tasks: {str(e)}")
        
        if result["errors"]:
            result["success"] = False
        
        return result
        
    except Exception as e:
        logger.error(f"TickTick sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_ticktick_status():
    """Get TickTick integration status"""
    return {
        "available": True,
        "message": "TickTick integration is available. Configure your access token to get started.",
        "features": [
            "Import tasks from TickTick",
            "Export tasks to TickTick", 
            "Bidirectional sync",
            "Project filtering"
        ]
    }
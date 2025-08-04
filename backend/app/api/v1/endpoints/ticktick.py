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

        # Import from TickTick to local (as weekly tasks)
        if request.sync_direction in ["import", "both"]:
            try:
                ticktick_response = await ticktick_service.get_tasks(
                    project_id=request.project_id
                )

                # Check if the response indicates an error
                if isinstance(ticktick_response, dict) and ticktick_response.get("status") == "error":
                    result["errors"].append(ticktick_response.get("error", "Unknown error fetching TickTick tasks"))
                elif isinstance(ticktick_response, dict):
                    ticktick_tasks = ticktick_response.get("tasks", [])
                    logger.debug(f"Processing {len(ticktick_tasks)} tasks from TickTick")

                    # Get existing local tasks to check for duplicates
                    existing_tasks = await task_service.get_weekly_tasks()
                    existing_ticktick_ids = {task.ticktick_id for task in existing_tasks if task.ticktick_id}
                    logger.debug(f"Found {len(existing_ticktick_ids)} existing tasks with TickTick IDs")

                    for i, tt_task in enumerate(ticktick_tasks):
                        try:
                            logger.debug(f"Task {i+1} type: {type(tt_task)}")
                            if isinstance(tt_task, dict):
                                ticktick_id = tt_task.get('id')

                                # Skip if task already exists locally
                                if ticktick_id in existing_ticktick_ids:
                                    logger.debug(f"Skipping task {i+1} (already exists): {tt_task.get('title', 'Unknown')}")
                                    continue

                                logger.debug(f"Processing task {i+1}: {tt_task.get('title', 'Unknown')}")
                                weekly_task_data = ticktick_service.convert_ticktick_to_weekly_task(tt_task)
                                logger.debug(f"Converted task data: {weekly_task_data}")
                                created_task = await task_service.create_weekly_task(weekly_task_data)
                                logger.debug(f"Created task result: {created_task}")
                                if created_task:
                                    result["imported"] += 1
                            else:
                                logger.error(f"Task {i+1} is not a dict but {type(tt_task)}: {tt_task}")
                                result["errors"].append(f"Task {i+1} has unexpected format: {type(tt_task)}")
                                continue
                        except Exception as e:
                            import traceback
                            logger.error(f"Error processing task {i+1}: {str(e)}")
                            logger.error(f"Traceback: {traceback.format_exc()}")
                            result["errors"].append(f"Failed to import task '{tt_task.get('title', 'Unknown')}': {str(e)}")
                else:
                    result["errors"].append(f"Unexpected response format: {type(ticktick_response)}")

            except Exception as e:
                result["errors"].append(f"Failed to fetch TickTick tasks: {str(e)}")

        # Export from local to TickTick (weekly tasks)
        if request.sync_direction in ["export", "both"]:
            try:
                local_tasks = await task_service.get_weekly_tasks()

                # Filter out tasks that already have TickTick IDs (to prevent duplicates)
                tasks_to_export = [task for task in local_tasks if not task.ticktick_id]
                logger.debug(f"Found {len(local_tasks)} local tasks, {len(tasks_to_export)} need to be exported to TickTick")

                for task in tasks_to_export:
                    try:
                        logger.debug(f"Exporting local task to TickTick: {task.text}")
                        created_tt_task = await ticktick_service.create_weekly_task(task)
                        if created_tt_task and created_tt_task.get("status") == "success":
                            result["exported"] += 1

                            # Update the local task with the returned TickTick ID by manually updating the data file
                            ticktick_id = created_tt_task.get("ticktick_id")
                            project_id = created_tt_task.get("project_id")

                            if ticktick_id:
                                logger.debug(f"Storing TickTick ID {ticktick_id} for local task {task.id}")
                                # Manually update the task data to store TickTick ID
                                data = await task_service._load_data(task_service.weekly_tasks_file)
                                for i, stored_task in enumerate(data["tasks"]):
                                    if stored_task["id"] == task.id:
                                        data["tasks"][i]["ticktick_id"] = ticktick_id
                                        data["tasks"][i]["project_id"] = project_id
                                        await task_service._save_data(task_service.weekly_tasks_file, data)
                                        break
                    except Exception as e:
                        result["errors"].append(f"Failed to export task '{task.text}': {str(e)}")

            except Exception as e:
                result["errors"].append(f"Failed to fetch local weekly tasks: {str(e)}")

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

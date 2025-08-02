from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.services.ticktick_service import ticktick_service

router = APIRouter()


class OAuthTokenRequest(BaseModel):
    authorization_code: str


@router.get("/status")
async def get_ticktick_status() -> Dict[str, Any]:
    """Get TickTick integration status"""
    return ticktick_service.get_connection_status()


@router.get("/oauth/authorize-url")
async def get_oauth_authorization_url(state: str = Query(default="default")) -> Dict[str, Any]:
    """Get OAuth2 authorization URL for TickTick"""
    auth_url = ticktick_service.get_oauth_authorization_url(state)

    if not auth_url:
        raise HTTPException(
            status_code=400,
            detail="OAuth2 not configured. Please set TICKTICK_CLIENT_ID and TICKTICK_REDIRECT_URI"
        )

    return {
        "authorization_url": auth_url,
        "instructions": "Visit this URL to authorize the application and get an authorization code"
    }


@router.post("/oauth/exchange-token")
async def exchange_oauth_token(request: OAuthTokenRequest) -> Dict[str, Any]:
    """Exchange authorization code for access token"""
    token_data = await ticktick_service.exchange_code_for_token(request.authorization_code)

    if not token_data:
        raise HTTPException(
            status_code=400,
            detail="Failed to exchange authorization code for token"
        )

    return {
        "status": "success",
        "message": "Successfully obtained access token",
        "token_data": token_data,
        "instructions": "Save the access_token to your .env file as TICKTICK_ACCESS_TOKEN"
    }


@router.post("/test-connection")
async def test_ticktick_connection() -> Dict[str, Any]:
    """Test TickTick connection by creating a test task"""
    if not ticktick_service.is_enabled():
        raise HTTPException(
            status_code=400,
            detail="TickTick integration is not enabled or access token not configured"
        )

    try:
        # Create a simple test task
        from app.models.task import Task
        from datetime import datetime

        test_task = Task(
            id=0,
            text="Test connection from Time Management Dashboard",
            priority="low",
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        result = await ticktick_service.create_task(test_task)

        if result and result.get("status") == "success":
            # Clean up the test task
            if result.get("ticktick_id"):
                await ticktick_service.delete_task(result["ticktick_id"], result.get("project_id"))

            return {
                "status": "success",
                "message": "TickTick connection test successful"
            }
        else:
            return {
                "status": "error",
                "message": result.get("message", "Unknown error") if result else "Failed to create test task"
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"TickTick connection test failed: {str(e)}"
        )


@router.get("/projects")
async def get_ticktick_projects() -> Dict[str, Any]:
    """Get all projects from TickTick"""
    if not ticktick_service.is_enabled():
        raise HTTPException(
            status_code=400,
            detail="TickTick integration is not enabled or access token not configured"
        )

    result = await ticktick_service.get_projects()

    if not result:
        raise HTTPException(
            status_code=500,
            detail="TickTick integration not available"
        )

    if result.get("status") == "error":
        raise HTTPException(
            status_code=400,
            detail=result.get("message", "Failed to fetch projects")
        )

    return result


@router.get("/tasks/simple")
async def get_ticktick_tasks_simple() -> Dict[str, Any]:
    """Get tasks from TickTick using a simple approach that gets tasks from all task projects"""
    if not ticktick_service.is_enabled():
        raise HTTPException(
            status_code=400,
            detail="TickTick integration is not enabled or access token not configured"
        )

    result = await ticktick_service.get_tasks_simple()

    if not result:
        raise HTTPException(
            status_code=500,
            detail="TickTick integration not available"
        )

    if result.get("status") == "error":
        raise HTTPException(
            status_code=400,
            detail=result.get("message", "Failed to fetch tasks")
        )

    return result


@router.get("/tasks")
async def get_ticktick_tasks(
    project_id: Optional[str] = Query(None, description="Optional project ID to filter tasks"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of tasks to fetch (1-100)")
) -> Dict[str, Any]:
    """
    Get tasks from TickTick
    
    Parameters:
    - project_id: Optional project ID to filter tasks (if not provided, gets tasks from all projects)
    - start_date: Optional start date filter in YYYY-MM-DD format
    - end_date: Optional end date filter in YYYY-MM-DD format  
    - limit: Maximum number of tasks to fetch (default 50, max 100)
    """
    if not ticktick_service.is_enabled():
        raise HTTPException(
            status_code=400,
            detail="TickTick integration is not enabled or access token not configured"
        )

    result = await ticktick_service.get_tasks(
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )

    if not result:
        raise HTTPException(
            status_code=500,
            detail="TickTick integration not available"
        )

    if result.get("status") == "error":
        raise HTTPException(
            status_code=400,
            detail=result.get("message", "Failed to fetch tasks")
        )

    return result


@router.get("/tasks/{task_id}")
async def get_ticktick_task_by_id(
    task_id: str,
    project_id: str = Query(..., description="Project ID that contains the task")
) -> Dict[str, Any]:
    """Get a specific task by ID from TickTick"""
    if not ticktick_service.is_enabled():
        raise HTTPException(
            status_code=400,
            detail="TickTick integration is not enabled or access token not configured"
        )

    result = await ticktick_service.get_task_by_id(task_id, project_id)

    if not result:
        raise HTTPException(
            status_code=500,
            detail="TickTick integration not available"
        )

    if result.get("status") == "error":
        raise HTTPException(
            status_code=404,
            detail=result.get("message", "Task not found")
        )

    return result

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional
import json

from app.models.task import WeeklyTask, WeeklyTaskCreate, WeeklyTaskUpdate, Distraction, DistractionCreate, LunchIdea, LunchIdeaCreate, LunchIdeaUpdate, DailyLunchUpdate, BreakfastIdea, BreakfastIdeaCreate, BreakfastIdeaUpdate, DailyBreakfastUpdate
from app.services.task_service import task_service
from app.services.obsidian_service import obsidian_service
import logging
logger = logging.getLogger("app")
router = APIRouter()

# Lunch Ideas


@router.get("/lunch-ideas", response_model=List[LunchIdea])
async def get_lunch_ideas():
    """Get all lunch ideas"""
    return await task_service.get_lunch_ideas()


@router.post("/lunch-ideas", response_model=LunchIdea)
async def create_lunch_idea(lunch_idea: LunchIdeaCreate):
    """Create a new lunch idea"""
    return await task_service.create_lunch_idea(lunch_idea)


@router.put("/lunch-ideas/{lunch_id}", response_model=LunchIdea)
async def update_lunch_idea(lunch_id: int, lunch_update: LunchIdeaUpdate):
    """Update a lunch idea"""
    updated_lunch = await task_service.update_lunch_idea(lunch_id, lunch_update)

    if not updated_lunch:
        raise HTTPException(status_code=404, detail="Lunch idea not found")

    return updated_lunch


@router.delete("/lunch-ideas/{lunch_id}")
async def delete_lunch_idea(lunch_id: int):
    """Delete a lunch idea"""
    success = await task_service.delete_lunch_idea(lunch_id)

    if not success:
        raise HTTPException(status_code=404, detail="Lunch idea not found")

    return {"message": "Lunch idea deleted successfully"}


# Breakfast Ideas

@router.get("/breakfast-ideas", response_model=List[BreakfastIdea])
async def get_breakfast_ideas():
    """Get all breakfast ideas"""
    return await task_service.get_breakfast_ideas()


@router.post("/breakfast-ideas", response_model=BreakfastIdea)
async def create_breakfast_idea(breakfast_idea: BreakfastIdeaCreate):
    """Create a new breakfast idea"""
    return await task_service.create_breakfast_idea(breakfast_idea)


@router.put("/breakfast-ideas/{breakfast_id}", response_model=BreakfastIdea)
async def update_breakfast_idea(breakfast_id: int, breakfast_update: BreakfastIdeaUpdate):
    """Update a breakfast idea"""
    updated_breakfast = await task_service.update_breakfast_idea(breakfast_id, breakfast_update)

    if not updated_breakfast:
        raise HTTPException(status_code=404, detail="Breakfast idea not found")

    return updated_breakfast


@router.delete("/breakfast-ideas/{breakfast_id}")
async def delete_breakfast_idea(breakfast_id: int):
    """Delete a breakfast idea"""
    success = await task_service.delete_breakfast_idea(breakfast_id)

    if not success:
        raise HTTPException(status_code=404, detail="Breakfast idea not found")

    return {"message": "Breakfast idea deleted successfully"}


# Weekly Tasks


@router.get("/weekly", response_model=List[WeeklyTask])
async def get_weekly_tasks(date: Optional[str] = None):
    """Get weekly tasks, optionally filtered by date (YYYY-MM-DD)"""
    return await task_service.get_weekly_tasks(date)


@router.post("/weekly", response_model=WeeklyTask)
async def create_weekly_task(task: WeeklyTaskCreate, background_tasks: BackgroundTasks):
    """Create a new weekly task"""

    logger.info(f"[API] ===== CREATING WEEKLY TASK API ENDPOINT: {task.text} =====")

    new_task = await task_service.create_weekly_task(task)

    logger.info(f"[API] Task service returned: {new_task}")
    logger.info(f"[API] Task has ticktick_id: {getattr(new_task, 'ticktick_id', 'NO ATTR')}")

    # Auto-sync to Obsidian in background
    background_tasks.add_task(obsidian_service.auto_sync_if_enabled)

    return new_task


@router.put("/weekly/{task_id}", response_model=WeeklyTask)
async def update_weekly_task(task_id: int, task_update: WeeklyTaskUpdate, background_tasks: BackgroundTasks):
    """Update a weekly task"""
    updated_task = await task_service.update_weekly_task(task_id, task_update)

    if not updated_task:
        raise HTTPException(status_code=404, detail="Weekly task not found")

    # Auto-sync to Obsidian in background
    background_tasks.add_task(obsidian_service.auto_sync_if_enabled)

    return updated_task


@router.post("/weekly/{task_id}/toggle", response_model=WeeklyTask)
async def toggle_weekly_task(task_id: int, background_tasks: BackgroundTasks):
    """Toggle weekly task completion status"""
    updated_task = await task_service.toggle_weekly_task(task_id)

    if not updated_task:
        raise HTTPException(status_code=404, detail="Weekly task not found")

    # Auto-sync to Obsidian in background
    background_tasks.add_task(obsidian_service.auto_sync_if_enabled)

    return updated_task


@router.delete("/weekly/{task_id}")
async def delete_weekly_task(task_id: int, background_tasks: BackgroundTasks):
    """Delete a weekly task"""
    success = await task_service.delete_weekly_task(task_id)

    if not success:
        raise HTTPException(status_code=404, detail="Weekly task not found")

    # Auto-sync to Obsidian in background
    background_tasks.add_task(obsidian_service.auto_sync_if_enabled)

    return {"message": "Weekly task deleted successfully"}


# Daily Lunch
@router.get("/weekly/{date}/lunch")
async def get_daily_lunch(date: str):
    """Get the lunch selection for a specific date"""
    lunch_id = await task_service.get_daily_lunch(date)
    return {"date": date, "lunch_id": lunch_id}


@router.put("/weekly/{date}/lunch")
async def update_daily_lunch(date: str, lunch_update: DailyLunchUpdate, background_tasks: BackgroundTasks):
    """Update the lunch selection for a specific date"""
    success = await task_service.update_daily_lunch(date, lunch_update.lunch_id)

    if not success:
        raise HTTPException(status_code=404, detail="Unable to update lunch for this date")

    # Auto-sync to Obsidian in background
    background_tasks.add_task(obsidian_service.auto_sync_if_enabled)

    return {"message": "Daily lunch updated successfully", "date": date, "lunch_id": lunch_update.lunch_id}

# Daily Breakfast
@router.get("/weekly/{date}/breakfast")
async def get_daily_breakfast(date: str):
    """Get the breakfast selection for a specific date"""
    breakfast_id = await task_service.get_daily_breakfast(date)
    return {"date": date, "breakfast_id": breakfast_id}


@router.put("/weekly/{date}/breakfast")
async def update_daily_breakfast(date: str, breakfast_update: DailyBreakfastUpdate, background_tasks: BackgroundTasks):
    """Update the breakfast selection for a specific date"""
    success = await task_service.update_daily_breakfast(date, breakfast_update.breakfast_id)

    if not success:
        raise HTTPException(status_code=404, detail="Unable to update breakfast for this date")

    # Auto-sync to Obsidian in background
    background_tasks.add_task(obsidian_service.auto_sync_if_enabled)

    return {"message": "Daily breakfast updated successfully", "date": date, "breakfast_id": breakfast_update.breakfast_id}

# Distractions


@router.get("/distractions", response_model=List[Distraction])
async def get_distractions():
    """Get all distractions"""
    return await task_service.get_distractions()


@router.post("/distractions", response_model=Distraction)
async def log_distraction(distraction: DistractionCreate, background_tasks: BackgroundTasks):
    """Log a new distraction"""
    new_distraction = await task_service.create_distraction(distraction)

    # Auto-sync to Obsidian in background
    background_tasks.add_task(obsidian_service.auto_sync_if_enabled)

    return new_distraction

# Stats


@router.get("/stats")
async def get_task_stats():
    """Get task statistics"""
    return await task_service.get_task_stats()

import json
import aiofiles
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path

from app.models.task import Task, TaskCreate, TaskUpdate, WeeklyTask, WeeklyTaskCreate, WeeklyTaskUpdate, Distraction, DistractionCreate, LunchIdea, LunchIdeaCreate, LunchIdeaUpdate
from app.core.config import settings
from app.services.ticktick_service import ticktick_service
import logging

logger = logging.getLogger("app")


class TaskService:
    def __init__(self):
        self.tasks_file = Path(settings.TASKS_FILE)
        self.weekly_tasks_file = Path(settings.WEEKLY_TASKS_FILE)
        self.lunch_ideas_file = Path("data/lunch_ideas.json")
        self.daily_lunches_file = Path("data/daily_lunches.json")
        self._ensure_files_exist()

    def _ensure_files_exist(self):
        """Ensure data files exist with empty arrays"""
        for file_path in [self.tasks_file, self.weekly_tasks_file]:
            if not file_path.exists():
                file_path.parent.mkdir(parents=True, exist_ok=True)
                with open(file_path, 'w') as f:
                    json.dump({"tasks": [], "distractions": [], "next_id": 1}, f)

        # Ensure lunch ideas file exists
        if not self.lunch_ideas_file.exists():
            self.lunch_ideas_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.lunch_ideas_file, 'w') as f:
                json.dump({"lunch_ideas": [], "next_id": 1}, f)

        # Ensure daily lunches file exists
        if not self.daily_lunches_file.exists():
            self.daily_lunches_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.daily_lunches_file, 'w') as f:
                json.dump({"daily_lunches": {}}, f)

    async def _load_data(self, file_path: Path) -> Dict[str, Any]:
        """Load data from JSON file"""
        try:
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()
                return json.loads(content)
        except (FileNotFoundError, json.JSONDecodeError):
            return {"tasks": [], "distractions": [], "next_id": 1}

    async def _save_data(self, file_path: Path, data: Dict[str, Any]):
        """Save data to JSON file"""
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(json.dumps(data, indent=2, default=str))

    # Daily Tasks
    async def get_tasks(self) -> List[Task]:
        """Get all daily tasks"""
        data = await self._load_data(self.tasks_file)
        return [Task(**task) for task in data.get("tasks", [])]

    async def create_task(self, task_data: TaskCreate) -> Task:
        """Create a new daily task"""
        data = await self._load_data(self.tasks_file)

        task = Task(
            id=data["next_id"],
            **task_data.dict(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        data["tasks"].insert(0, task.dict())  # Add to beginning
        data["next_id"] += 1

        await self._save_data(self.tasks_file, data)

        # Create task in TickTick if integration is enabled
        ticktick_result = await ticktick_service.create_task(task)
        if ticktick_result and ticktick_result.get("status") == "success":
            # Store TickTick ID and project ID with the task for future updates
            for i, stored_task in enumerate(data["tasks"]):
                if stored_task["id"] == task.id:
                    data["tasks"][i]["ticktick_id"] = ticktick_result.get("ticktick_id")
                    data["tasks"][i]["project_id"] = ticktick_result.get("project_id")
                    await self._save_data(self.tasks_file, data)
                    break

        return task

    async def update_task(self, task_id: int, task_update: TaskUpdate) -> Optional[Task]:
        """Update a daily task"""
        data = await self._load_data(self.tasks_file)

        for i, task in enumerate(data["tasks"]):
            if task["id"] == task_id:
                # Get the old task data before update for TickTick sync
                old_task = Task(**data["tasks"][i])

                # Update only provided fields
                update_data = task_update.dict(exclude_unset=True)
                update_data["updated_at"] = datetime.now()

                data["tasks"][i].update(update_data)
                updated_task = Task(**data["tasks"][i])

                # Sync with TickTick if task has TickTick ID
                ticktick_id = task.get("ticktick_id")
                if ticktick_id:
                    await ticktick_service.update_daily_task(ticktick_id, old_task, updated_task)

                await self._save_data(self.tasks_file, data)
                return updated_task

        return None

    async def delete_task(self, task_id: int) -> bool:
        """Delete a daily task"""
        data = await self._load_data(self.tasks_file)

        for i, task in enumerate(data["tasks"]):
            if task["id"] == task_id:
                # Delete from TickTick if task has TickTick ID
                ticktick_id = task.get("ticktick_id")
                project_id = task.get("project_id")
                if ticktick_id and project_id:
                    await ticktick_service.delete_task(ticktick_id, project_id)

                data["tasks"].pop(i)
                await self._save_data(self.tasks_file, data)
                return True

        return False

    async def toggle_task(self, task_id: int) -> Optional[Task]:
        """Toggle task completion status"""
        data = await self._load_data(self.tasks_file)

        for i, task in enumerate(data["tasks"]):
            if task["id"] == task_id:
                new_completed = not data["tasks"][i]["completed"]
                data["tasks"][i]["completed"] = new_completed
                data["tasks"][i]["updated_at"] = datetime.now()

                # Sync with TickTick if task has TickTick ID
                ticktick_id = task.get("ticktick_id")
                if ticktick_id:
                    await ticktick_service.update_task_completion(ticktick_id, new_completed)

                await self._save_data(self.tasks_file, data)
                return Task(**data["tasks"][i])

        return None

    # Weekly Tasks
    async def get_weekly_tasks(self, date: Optional[str] = None) -> List[WeeklyTask]:
        """Get weekly tasks, optionally filtered by date"""
        data = await self._load_data(self.weekly_tasks_file)
        tasks = [WeeklyTask(**task) for task in data.get("tasks", [])]

        if date:
            tasks = [task for task in tasks if task.date == date]

        return tasks

    async def create_weekly_task(self, task_data: WeeklyTaskCreate) -> WeeklyTask:
        """Create a new weekly task"""
        data = await self._load_data(self.weekly_tasks_file)

        task = WeeklyTask(
            id=data["next_id"],
            **task_data.dict(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        data["tasks"].append(task.dict())
        data["next_id"] += 1

        await self._save_data(self.weekly_tasks_file, data)

        # Create task in TickTick if integration is enabled
        ticktick_result = await ticktick_service.create_weekly_task(task)
        if ticktick_result and ticktick_result.get("status") == "success":
            # Store TickTick ID and project ID with the task for future updates
            for i, stored_task in enumerate(data["tasks"]):
                if stored_task["id"] == task.id:
                    data["tasks"][i]["ticktick_id"] = ticktick_result.get("ticktick_id")
                    if ticktick_result.get("ticktick_data"):
                        data["tasks"][i]["project_id"] = ticktick_result["ticktick_data"].get("projectId")
                    await self._save_data(self.weekly_tasks_file, data)
                    break

        return task

    async def update_weekly_task(self, task_id: int, task_update: WeeklyTaskUpdate) -> Optional[WeeklyTask]:
        """Update a weekly task"""
        data = await self._load_data(self.weekly_tasks_file)

        for i, task in enumerate(data["tasks"]):
            if task["id"] == task_id:
                update_data = task_update.dict(exclude_unset=True)
                update_data["updated_at"] = datetime.now()

                # Get the old task data before update for TickTick sync
                old_task = WeeklyTask(**data["tasks"][i])

                data["tasks"][i].update(update_data)
                updated_task = WeeklyTask(**data["tasks"][i])

                # Sync with TickTick if task has TickTick ID
                ticktick_id = task.get("ticktick_id")
                if ticktick_id:
                    await ticktick_service.update_weekly_task(ticktick_id, old_task, updated_task)

                await self._save_data(self.weekly_tasks_file, data)
                return updated_task

        return None

    async def delete_weekly_task(self, task_id: int) -> bool:
        """Delete a weekly task"""
        data = await self._load_data(self.weekly_tasks_file)

        for i, task in enumerate(data["tasks"]):
            if task["id"] == task_id:
                # Delete from TickTick if task has TickTick ID
                ticktick_id = task.get("ticktick_id")
                project_id = task.get("project_id")  # Store project_id when creating task
                if ticktick_id and project_id:
                    await ticktick_service.delete_task(ticktick_id, project_id)

                data["tasks"].pop(i)
                await self._save_data(self.weekly_tasks_file, data)
                return True

        return False

    async def toggle_weekly_task(self, task_id: int) -> Optional[WeeklyTask]:
        """Toggle weekly task completion status"""
        data = await self._load_data(self.weekly_tasks_file)

        for i, task in enumerate(data["tasks"]):
            if task["id"] == task_id:
                new_completed = not data["tasks"][i]["completed"]
                data["tasks"][i]["completed"] = new_completed
                data["tasks"][i]["updated_at"] = datetime.now()

                # Sync with TickTick if task has TickTick ID
                ticktick_id = task.get("ticktick_id")
                if ticktick_id:
                    await ticktick_service.update_task_completion(ticktick_id, new_completed)

                await self._save_data(self.weekly_tasks_file, data)
                return WeeklyTask(**data["tasks"][i])

        return None

    # Distractions
    async def get_distractions(self) -> List[Distraction]:
        """Get all distractions"""
        data = await self._load_data(self.tasks_file)
        return [Distraction(**distraction) for distraction in data.get("distractions", [])]

    async def create_distraction(self, distraction_data: DistractionCreate) -> Distraction:
        """Log a new distraction"""
        data = await self._load_data(self.tasks_file)

        if "distractions" not in data:
            data["distractions"] = []

        distraction = Distraction(
            id=len(data["distractions"]) + 1,
            **distraction_data.dict(),
            created_at=datetime.now()
        )

        data["distractions"].insert(0, distraction.dict())  # Add to beginning
        await self._save_data(self.tasks_file, data)
        return distraction

    async def get_task_stats(self) -> Dict[str, int]:
        """Get task statistics"""
        daily_data = await self._load_data(self.tasks_file)
        weekly_data = await self._load_data(self.weekly_tasks_file)

        daily_tasks = daily_data.get("tasks", [])
        weekly_tasks = weekly_data.get("tasks", [])
        distractions = daily_data.get("distractions", [])

        completed_daily = len([t for t in daily_tasks if t.get("completed", False)])
        completed_weekly = len([t for t in weekly_tasks if t.get("completed", False)])

        return {
            "total_daily_tasks": len(daily_tasks),
            "completed_daily_tasks": completed_daily,
            "total_weekly_tasks": len(weekly_tasks),
            "completed_weekly_tasks": completed_weekly,
            "total_distractions": len(distractions),
            "productivity_score": max(0, 100 - (len(distractions) * 10))
        }

    # Lunch Ideas
    async def get_lunch_ideas(self) -> List[LunchIdea]:
        """Get all lunch ideas"""
        data = await self._load_data(self.lunch_ideas_file)
        return [LunchIdea(**idea) for idea in data.get("lunch_ideas", [])]

    async def create_lunch_idea(self, lunch_data: LunchIdeaCreate) -> LunchIdea:
        """Create a new lunch idea"""
        data = await self._load_data(self.lunch_ideas_file)

        lunch_idea = LunchIdea(
            id=data["next_id"],
            **lunch_data.dict(),
            created_at=datetime.now()
        )

        data["lunch_ideas"].append(lunch_idea.dict())
        data["next_id"] += 1

        await self._save_data(self.lunch_ideas_file, data)
        return lunch_idea

    async def update_lunch_idea(self, lunch_id: int, lunch_update: LunchIdeaUpdate) -> Optional[LunchIdea]:
        """Update a lunch idea"""
        data = await self._load_data(self.lunch_ideas_file)

        for i, idea in enumerate(data["lunch_ideas"]):
            if idea["id"] == lunch_id:
                update_data = lunch_update.dict(exclude_unset=True)
                data["lunch_ideas"][i].update(update_data)
                updated_idea = LunchIdea(**data["lunch_ideas"][i])

                await self._save_data(self.lunch_ideas_file, data)
                return updated_idea

        return None

    async def delete_lunch_idea(self, lunch_id: int) -> bool:
        """Delete a lunch idea"""
        data = await self._load_data(self.lunch_ideas_file)

        for i, idea in enumerate(data["lunch_ideas"]):
            if idea["id"] == lunch_id:
                data["lunch_ideas"].pop(i)
                await self._save_data(self.lunch_ideas_file, data)
                return True

        return False

    # Daily Lunch Management
    async def get_daily_lunch(self, date: str) -> Optional[int]:
        """Get the lunch selection for a specific date"""
        data = await self._load_data(self.daily_lunches_file)
        return data.get("daily_lunches", {}).get(date)

    async def update_daily_lunch(self, date: str, lunch_id: Optional[int]) -> bool:
        """Update the lunch selection for a specific date"""
        data = await self._load_data(self.daily_lunches_file)

        if "daily_lunches" not in data:
            data["daily_lunches"] = {}

        if lunch_id is None:
            # Remove lunch selection for this date
            data["daily_lunches"].pop(date, None)
        else:
            # Set lunch selection for this date
            data["daily_lunches"][date] = lunch_id

        await self._save_data(self.daily_lunches_file, data)
        return True


# Global instance
task_service = TaskService()

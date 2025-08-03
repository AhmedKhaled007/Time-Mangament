import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import requests
from zoneinfo import ZoneInfo

from app.core.config import settings
from app.models.task import WeeklyTask

logger = logging.getLogger("app")


class TickTickService:
    """Service for integrating with TickTick API for task management."""

    def __init__(self):
        self.base_url = "https://api.ticktick.com/open/v1"
        self.session = requests.Session()
        self.session.timeout = 30

    def _is_enabled(self) -> bool:
        """Check if TickTick integration is enabled."""
        return getattr(settings, 'TICKTICK_ENABLED', False)

    def _get_access_token(self) -> Optional[str]:
        """Get TickTick access token from settings."""
        if not self._is_enabled():
            return None
        return getattr(settings, 'TICKTICK_ACCESS_TOKEN', None)

    def _get_priority_mapping(self, local_priority: str) -> int:
        """Map local priority to TickTick priority values."""
        mapping = {
            "high": 3,    # High priority in TickTick
            "medium": 1,  # Normal priority in TickTick
            "low": 0      # None/Low priority in TickTick
        }
        return mapping.get(local_priority, 1)

    def _parse_task_datetime(self, date_str: str, time_str: Optional[str] = None) -> datetime:
        """Parse date and time strings into a datetime object with Egypt timezone."""
        egypt_tz = ZoneInfo("Africa/Cairo")
        
        if time_str:
            datetime_str = f"{date_str} {time_str}"
            dt = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M")
        else:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            dt = dt.replace(hour=9)  # Default to 9 AM if no time specified
        
        return dt.replace(tzinfo=egypt_tz)

    def _format_datetime_for_ticktick(self, dt: datetime) -> str:
        """Format datetime for TickTick API."""
        return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + dt.strftime("%z")

    def _create_success_response(self, message: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create standardized success response."""
        response = {
            "status": "success",
            "message": message
        }
        if data:
            response.update(data)
        return response

    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """Create standardized error response."""
        return {
            "status": "error",
            "error": error_message
        }

    async def get_projects(self) -> Optional[List[Dict[str, Any]]]:
        """Get all projects from TickTick."""
        logger.debug("[TickTick] Fetching all projects")
        
        access_token = self._get_access_token()
        if not access_token:
            logger.debug("[TickTick] No access token available")
            return None

        try:
            url = f"{self.base_url}/project"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }

            logger.debug(f"[TickTick] Making GET request to: {url}")
            response = self.session.get(url, headers=headers)

            logger.debug(f"[TickTick] Get projects response: {response.status_code}")

            if response.status_code == 200:
                projects = response.json()
                logger.debug(f"[TickTick] Found {len(projects)} projects")
                return projects
            else:
                logger.error(f"Failed to fetch TickTick projects: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Failed to fetch TickTick projects: {str(e)}")
            return None

    async def create_weekly_task(self, task: WeeklyTask) -> Optional[Dict[str, Any]]:
        """Create a weekly task in TickTick with date and time information."""
        logger.debug(f"[TickTick] Starting weekly task creation for: '{task.text}'")
        logger.debug(f"[TickTick] Weekly task details - Date: {task.date}, From: {task.from_time}, To: {task.to_time}")

        access_token = self._get_access_token()
        if not access_token:
            logger.debug("[TickTick] No access token available, skipping weekly task creation")
            return None

        try:
            logger.debug("[TickTick] Parsing task datetime for weekly task")
            task_date = self._parse_task_datetime(task.date, task.from_time)
            
            # Determine if this is an all-day task
            is_all_day = not task.from_time or not task.to_time
            logger.debug(f"[TickTick] Task is all-day: {is_all_day}")

            # Calculate end time for timed tasks
            end_date = None
            if not is_all_day and task.to_time:
                end_date = self._parse_task_datetime(task.date, task.to_time)

            # Prepare task data for TickTick API
            task_data = {
                "title": task.text,
                "content": "",
                "startDate": self._format_datetime_for_ticktick(task_date),
                "isAllDay": is_all_day,
                "status": 0,  # 0 = incomplete, 1 = complete
                "sortOrder": -1
            }

            # Add due date for timed tasks
            if end_date:
                task_data["dueDate"] = self._format_datetime_for_ticktick(end_date)

            logger.debug(f"[TickTick] Weekly task data prepared: {task_data}")

            url = f"{self.base_url}/task"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }

            logger.debug(f"[TickTick] Making POST request to: {url}")
            response = self.session.post(url, headers=headers, json=task_data)

            logger.debug(f"[TickTick] Create weekly task response: {response.status_code}")
            logger.debug(f"[TickTick] Create weekly task response body: {response.text[:500]}...")

            if response.status_code == 200:
                created_task_data = response.json()
                task_id = created_task_data.get("id")
                project_id = created_task_data.get("projectId")

                logger.debug(f"[TickTick] Weekly task created successfully with ID: {task_id}")
                logger.info(f"Successfully created TickTick weekly task: {task.text}")

                return self._create_success_response(
                    "Weekly task created in TickTick",
                    {
                        "ticktick_id": task_id,
                        "ticktick_data": created_task_data,
                        "project_id": project_id
                    }
                )
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.debug(f"[TickTick] Weekly task creation failed: {error_msg}")
                logger.error(f"Failed to create TickTick weekly task: {error_msg}")
                return self._create_error_response(f"Failed to create TickTick weekly task: {error_msg}")

        except Exception as e:
            logger.debug(f"[TickTick] Exception during weekly task creation: {str(e)}")
            logger.error(f"Failed to create TickTick weekly task: {str(e)}")
            return self._create_error_response(f"Failed to create TickTick weekly task: {str(e)}")

    async def update_weekly_task(self, ticktick_id: str, updated_task: WeeklyTask) -> Optional[Dict[str, Any]]:
        """Update a weekly task in TickTick with new information."""
        logger.debug(f"[TickTick] Starting weekly task update for ID: {ticktick_id}")
        logger.debug(f"[TickTick] Updated weekly task details - Text: '{updated_task.text}', Date: {updated_task.date}")

        access_token = self._get_access_token()
        if not access_token:
            logger.debug("[TickTick] No access token available, skipping weekly task update")
            return None

        try:
            logger.debug("[TickTick] Parsing updated task datetime for weekly task")
            task_date = self._parse_task_datetime(updated_task.date, updated_task.from_time)
            
            # Determine if this is an all-day task
            is_all_day = not updated_task.from_time or not updated_task.to_time
            logger.debug(f"[TickTick] Task is all-day: {is_all_day}")

            # Calculate end time for timed tasks
            end_date = None
            if not is_all_day and updated_task.to_time:
                end_date = self._parse_task_datetime(updated_task.date, updated_task.to_time)

            task_data = {
                "title": updated_task.text,
                "content": "",
                "startDate": self._format_datetime_for_ticktick(task_date),
                "isAllDay": is_all_day,
                "status": 1 if updated_task.completed else 0
            }

            # Add due date for timed tasks
            if end_date:
                task_data["dueDate"] = self._format_datetime_for_ticktick(end_date)

            logger.debug(f"[TickTick] Weekly task update data: {task_data}")

            url = f"{self.base_url}/task/{ticktick_id}"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }

            logger.debug(f"[TickTick] Making PUT request to: {url}")
            response = self.session.put(url, headers=headers, json=task_data)

            logger.debug(f"[TickTick] Update weekly task response: {response.status_code}")
            logger.debug(f"[TickTick] Update weekly task response body: {response.text[:500]}...")

            if response.status_code == 200:
                logger.debug(f"[TickTick] Weekly task updated successfully: {updated_task.text}")
                logger.info(f"Successfully updated TickTick weekly task: {updated_task.text}")
                return self._create_success_response("TickTick weekly task updated successfully")
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.debug(f"[TickTick] Weekly task update failed: {error_msg}")
                logger.error(f"Failed to update TickTick weekly task: {error_msg}")
                return self._create_error_response(f"Failed to update TickTick weekly task: {error_msg}")

        except Exception as e:
            logger.debug(f"[TickTick] Exception during weekly task update: {str(e)}")
            logger.error(f"Failed to update TickTick weekly task: {str(e)}")
            return self._create_error_response(f"Failed to update TickTick weekly task: {str(e)}")

    async def update_task_completion(self, ticktick_id: str, completed: bool, project_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update task completion status in TickTick."""
        logger.debug(f"[TickTick] Starting task completion update for ID: {ticktick_id}")
        logger.debug(f"[TickTick] Setting completed status to: {completed}")

        access_token = self._get_access_token()
        if not access_token:
            logger.debug("[TickTick] No access token available, skipping task completion update")
            return None

        try:
            if completed:
                # Complete the task
                url = f"{self.base_url}/task/{ticktick_id}/complete"
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }

                logger.debug(f"[TickTick] Making POST request to complete task: {url}")
                response = self.session.post(url, headers=headers)
                status_text = "completed"
            else:
                # Uncomplete the task by updating its status
                task_data = {
                    "status": 0  # 0 = incomplete
                }

                logger.debug(f"[TickTick] Task uncomplete data: {task_data}")

                url = f"{self.base_url}/task/{ticktick_id}"
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }

                logger.debug(f"[TickTick] Making PUT request to uncomplete task: {url}")
                response = self.session.put(url, headers=headers, json=task_data)
                status_text = "uncompleted"

            logger.debug(f"[TickTick] Task completion update response: {response.status_code}")
            logger.debug(f"[TickTick] Task completion update response body: {response.text[:500]}...")

            if response.status_code == 200:
                logger.debug(f"[TickTick] Task {ticktick_id} marked as {status_text} successfully")
                logger.info(f"Successfully updated TickTick task completion status")
                return self._create_success_response(f"Task marked as {status_text} in TickTick")
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.debug(f"[TickTick] Task completion update failed: {error_msg}")
                logger.error(f"Failed to update TickTick task completion: {error_msg}")
                return self._create_error_response(f"Failed to update TickTick task completion: {error_msg}")

        except Exception as e:
            logger.debug(f"[TickTick] Exception during task completion update: {str(e)}")
            logger.error(f"Failed to update TickTick task completion: {str(e)}")
            return self._create_error_response(f"Failed to update TickTick task completion: {str(e)}")

    async def delete_task(self, ticktick_id: str, project_id: str) -> Optional[Dict[str, Any]]:
        """Delete a task from TickTick."""
        logger.debug(f"[TickTick] Starting task deletion for ID: {ticktick_id}")
        logger.debug(f"[TickTick] Task project ID: {project_id}")

        access_token = self._get_access_token()
        if not access_token:
            logger.debug("[TickTick] No access token available, skipping task deletion")
            return None

        try:
            url = f"{self.base_url}/project/{project_id}/task/{ticktick_id}"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }

            logger.debug(f"[TickTick] Making DELETE request to: {url}")
            response = self.session.delete(url, headers=headers)

            logger.debug(f"[TickTick] Delete task response: {response.status_code}")
            logger.debug(f"[TickTick] Delete task response body: {response.text[:500]}...")

            if response.status_code == 200:
                logger.debug(f"[TickTick] Task {ticktick_id} deleted successfully")
                logger.info(f"Successfully deleted TickTick task")
                return self._create_success_response("Task deleted from TickTick")
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.debug(f"[TickTick] Task deletion failed: {error_msg}")
                logger.error(f"Failed to delete TickTick task: {error_msg}")
                return self._create_error_response(f"Failed to delete TickTick task: {error_msg}")

        except Exception as e:
            logger.debug(f"[TickTick] Exception during task deletion: {str(e)}")
            logger.error(f"Failed to delete TickTick task: {str(e)}")
            return self._create_error_response(f"Failed to delete TickTick task: {str(e)}")


# Global instance
ticktick_service = TickTickService()
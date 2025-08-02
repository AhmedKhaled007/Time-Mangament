import logging
import json
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import requests
import asyncio

from app.core.config import settings
from app.models.task import Task, WeeklyTask

logger = logging.getLogger("app")


class TickTickService:
    def __init__(self):
        self._access_token: Optional[str] = None
        self._is_connected = False
        self.base_url = "https://api.ticktick.com/open/v1"
        self.oauth_base_url = "https://ticktick.com/oauth"
        self.session = requests.Session()
        self.session.timeout = 30
        self._access_token = settings.TICKTICK_ACCESS_TOKEN

    def _authenticate(self) -> bool:
        """Authenticate with TickTick API using stored access token"""
        if not settings.TICKTICK_ENABLED:
            logger.info("TickTick integration is disabled")
            return False

        # Check if we have a valid access token
        if settings.TICKTICK_ACCESS_TOKEN:
            self._access_token = settings.TICKTICK_ACCESS_TOKEN
            # Test the token by making a simple API call
            if self._test_access_token():
                self._is_connected = True
                logger.info("TickTick authentication successful using stored access token")
                return True
            else:
                logger.error("Stored TickTick access token is invalid")
                return False

        logger.error("TickTick authentication failed: No access token configured")
        logger.info("Please set TICKTICK_ACCESS_TOKEN in your .env file")
        return False

    def _test_access_token(self) -> bool:
        """Test if the current access token is valid"""
        if not self._access_token:
            return False

        try:
            response = self.session.get(
                f"{self.base_url}/project",
                headers={"Authorization": f"Bearer {self._access_token}"},
                params={"limit": 1}  # Just get one task to test
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to test access token: {str(e)}")
            return False

    def is_enabled(self) -> bool:
        """Check if TickTick integration is enabled and has access token"""
        return settings.TICKTICK_ENABLED and bool(settings.TICKTICK_ACCESS_TOKEN)

    async def create_task(self, task: Task) -> Optional[Dict[str, Any]]:
        """Create a task in TickTick from local task"""
        if not self.is_enabled():
            logger.debug("TickTick integration not enabled, skipping task creation")
            return None

        try:
            # Map priority from our system to TickTick
            priority_mapping = {
                "high": 3,
                "medium": 1,
                "low": 0
            }

            ticktick_priority = priority_mapping.get(task.priority.value, 1)

            # Prepare task data for TickTick API
            task_data = {
                "title": task.text,
                "priority": ticktick_priority,
                "content": "",  # TickTick supports task content/description
                "startDate": datetime.now(timezone.utc).isoformat(),
                "isAllDay": False,
                "status": 0,  # 0 = normal, 1 = completed
                "sortOrder": -1  # Add to top of list
            }
            logger.info(f"Creating task with data: {task_data}")
            response = self.session.post(
                f"{self.base_url}/task",
                headers={
                    "Authorization": f"Bearer {self._access_token}",
                    "Content-Type": "application/json"
                },
                json=task_data
            )
            logger.info(f"Creating task response: {response.status_code} - {response.text}")
            if response.status_code == 200:
                created_task_data = response.json()
                ticktick_id = created_task_data.get("id")

                logger.info(f"Successfully created TickTick task: {task.text}")
                return {
                    "ticktick_id": ticktick_id,
                    "status": "success",
                    "message": "Task created in TickTick",
                    "ticktick_data": created_task_data,
                    "project_id": created_task_data.get("projectId")
                }
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.error(f"Failed to create TickTick task: {error_msg}")
                return {
                    "status": "error",
                    "message": f"Failed to create TickTick task: {error_msg}"
                }

        except Exception as e:
            logger.error(f"Failed to create TickTick task: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to create TickTick task: {str(e)}"
            }

    async def update_daily_task(self, ticktick_id: str, old_task: Task, updated_task: Task) -> Optional[Dict[str, Any]]:
        """Update a daily task in TickTick with new information"""
        if not self.is_enabled():
            return None

        try:
            # Map priority from our system to TickTick
            priority_mapping = {
                "high": 3,
                "medium": 1,
                "low": 0
            }

            ticktick_priority = priority_mapping.get(updated_task.priority.value, 1)

            # Prepare updated task data for TickTick API
            task_data = {
                "title": updated_task.text,
                "priority": ticktick_priority,
                "content": "",
                "status": 1 if updated_task.completed else 0  # 1 = completed, 0 = normal
            }

            response = self.session.put(
                f"{self.base_url}/task/{ticktick_id}",
                headers={
                    "Authorization": f"Bearer {self._access_token}",
                    "Content-Type": "application/json"
                },
                json=task_data
            )

            if response.status_code == 200:
                logger.info(f"Successfully updated TickTick daily task: {updated_task.text}")
                return {
                    "status": "success",
                    "message": "Daily task updated in TickTick",
                    "ticktick_data": response.json()
                }
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.error(f"Failed to update TickTick daily task: {error_msg}")
                return {
                    "status": "error",
                    "message": f"Failed to update TickTick daily task: {error_msg}"
                }

        except Exception as e:
            logger.error(f"Failed to update TickTick daily task: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to update TickTick daily task: {str(e)}"
            }

    async def create_weekly_task(self, task: WeeklyTask) -> Optional[Dict[str, Any]]:
        """Create a weekly task in TickTick with date and time information"""
        if not self.is_enabled():
            logger.debug("TickTick integration not enabled, skipping weekly task creation")
            return None

        try:
            # Create task title with date and time info
            task_title = f"{task.text}"

            # Parse the date for TickTick
            task_date = datetime.strptime(task.date, "%Y-%m-%d")

            # If we have from_time, combine it with the date for startDate
            start_date = task_date
            if task.from_time:
                try:
                    time_parts = task.from_time.split(":")
                    start_date = task_date.replace(
                        hour=int(time_parts[0]),
                        minute=int(time_parts[1])
                    )
                except (ValueError, IndexError):
                    logger.error("Failed to parse from_time for weekly task")  # Use the date without time if parsing fails
            # due_date = task_date
            # Prepare task data for TickTick API
            logger.info(f"startDate : {task_date.replace(tzinfo=timezone.utc).isoformat()}")
            start_date = task_date.replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S%z")
            a = "2025-08-08T21:00:00.000+0000"
            logger.info(
                f"'2025-08-03T21:00:00.000+0000' == {task_date.replace(tzinfo=timezone.utc).isoformat()} is {'2025-08-03T21:00:00.000+0000' == task_date.replace(tzinfo=timezone.utc).isoformat()}")
            task_data = {
                "title": task_title,
                "content": f"Scheduled for {task.date}",
                "startDate": start_date,
                "dueDate": a,
                "isAllDay": True,
                # "reminders": [],
                "status": 0,  # 0 = normal, 1 = completed
                # "sortOrder": -1,
                "timeZone": "Africa/Cairo"  # Set timezone to Cairo
            }
            logger.info(f"Creating weekly task with data: {task_data}")
            response = self.session.post(
                f"{self.base_url}/task",
                headers={
                    "Authorization": f"Bearer {self._access_token}",
                    "Content-Type": "application/json"
                },
                json=task_data
            )

            if response.status_code == 200:
                created_task_data = response.json()
                ticktick_id = created_task_data.get("id")

                logger.info(f"Successfully created TickTick weekly task: {task.text}")
                return {
                    "ticktick_id": ticktick_id,
                    "status": "success",
                    "message": "Weekly task created in TickTick",
                    "ticktick_data": created_task_data
                }
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.error(f"Failed to create TickTick weekly task: {error_msg}")
                return {
                    "status": "error",
                    "message": f"Failed to create TickTick weekly task: {error_msg}"
                }

        except Exception as e:
            logger.error(f"Failed to create TickTick weekly task: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to create TickTick weekly task: {str(e)}"
            }

    async def update_weekly_task(self, ticktick_id: str, old_task: WeeklyTask, updated_task: WeeklyTask) -> Optional[Dict[str, Any]]:
        """Update a weekly task in TickTick with new information"""
        if not self.is_enabled():
            return None

        try:
            # Create updated task title with date and time info
            task_title = f"{updated_task.text}"
            if updated_task.from_time and updated_task.to_time:
                task_title += f" ({updated_task.from_time}-{updated_task.to_time})"

            # Parse the date for TickTick
            task_date = datetime.strptime(updated_task.date, "%Y-%m-%d")

            # If we have from_time, combine it with the date for startDate
            start_date = task_date
            if updated_task.from_time:
                try:
                    time_parts = updated_task.from_time.split(":")
                    start_date = task_date.replace(
                        hour=int(time_parts[0]),
                        minute=int(time_parts[1])
                    )
                except (ValueError, IndexError):
                    pass  # Use the date without time if parsing fails

            # Prepare updated task data for TickTick API
            task_data = {
                "title": task_title,
                "content": f"Scheduled for {updated_task.date}",
                "startDate": start_date.replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S%z"),
                "dueDate": task_date.replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S%z"),
                "isAllDay": not (updated_task.from_time and updated_task.to_time),
                "status": 1 if updated_task.completed else 0  # 1 = completed, 0 = normal
            }

            response = self.session.post(
                f"{self.base_url}/task/{ticktick_id}",
                headers={
                    "Authorization": f"Bearer {self._access_token}",
                    "Content-Type": "application/json"
                },
                json=task_data
            )

            if response.status_code == 200:
                logger.info(f"Successfully updated TickTick weekly task: {updated_task.text}")
                return {
                    "status": "success",
                    "message": "Weekly task updated in TickTick",
                    "ticktick_data": response.json()
                }
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.error(f"Failed to update TickTick weekly task: {error_msg}")
                return {
                    "status": "error",
                    "message": f"Failed to update TickTick weekly task: {error_msg}"
                }

        except Exception as e:
            logger.error(f"Failed to update TickTick weekly task: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to update TickTick weekly task: {str(e)}"
            }

    async def update_task_completion(self, ticktick_id: str, completed: bool) -> Optional[Dict[str, Any]]:
        """Update task completion status in TickTick"""
        if not self.is_enabled():
            return None

        try:
            # Update task completion status using PUT request
            task_data = {
                "status": 1 if completed else 0  # 1 = completed, 0 = normal
            }

            response = self.session.put(
                f"{self.base_url}/task/{ticktick_id}",
                headers={
                    "Authorization": f"Bearer {self._access_token}",
                    "Content-Type": "application/json"
                },
                json=task_data
            )

            if response.status_code == 200:
                status_text = "completed" if completed else "uncompleted"
                logger.info(f"Successfully marked TickTick task {ticktick_id} as {status_text}")
                return {
                    "status": "success",
                    "message": f"Task marked as {status_text} in TickTick"
                }
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.error(f"Failed to update TickTick task completion: {error_msg}")
                return {
                    "status": "error",
                    "message": f"Failed to update TickTick task: {error_msg}"
                }

        except Exception as e:
            logger.error(f"Failed to update TickTick task completion: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to update TickTick task: {str(e)}"
            }

    async def delete_task(self, ticktick_id: str, project_id: str) -> Optional[Dict[str, Any]]:
        """Delete a task from TickTick"""
        if not self.is_enabled():
            logger.debug("TickTick integration not enabled, skipping task deletion")
            return None

        try:
            logger.info(f"Deleting task with url : {self.base_url}/task/{ticktick_id}")
            response = self.session.delete(
                f"{self.base_url}/project/{project_id}/task/{ticktick_id}",
                headers={
                    "Authorization": f"Bearer {self._access_token}"
                }
            )

            if response.status_code == 200:
                logger.info(f"Successfully deleted TickTick task: {ticktick_id}")
                return {
                    "status": "success",
                    "message": "Task deleted from TickTick"
                }
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.error(f"Failed to delete TickTick task: {error_msg}")
                return {
                    "status": "error",
                    "message": f"Failed to delete TickTick task: {error_msg}"
                }

        except Exception as e:
            logger.error(f"Failed to delete TickTick task: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to delete TickTick task: {str(e)}"
            }

    def get_connection_status(self) -> Dict[str, Any]:
        """Get the current connection status"""
        return {
            "enabled": settings.TICKTICK_ENABLED,
            "connected": self._is_connected,
            "access_token_configured": bool(settings.TICKTICK_ACCESS_TOKEN),
            "oauth_configured": bool(settings.TICKTICK_CLIENT_ID and settings.TICKTICK_CLIENT_SECRET)
        }

    def get_oauth_authorization_url(self, state: str = "default") -> Optional[str]:
        """Get OAuth2 authorization URL for TickTick"""
        if not settings.TICKTICK_CLIENT_ID or not settings.TICKTICK_REDIRECT_URI:
            return None

        # Construct OAuth2 authorization URL
        auth_url = (
            f"{self.oauth_base_url}/authorize?"
            f"client_id={settings.TICKTICK_CLIENT_ID}&"
            f"redirect_uri={settings.TICKTICK_REDIRECT_URI}&"
            f"response_type=code&"
            f"scope=tasks:read tasks:write&"
            f"state={state}"
        )

        return auth_url

    async def exchange_code_for_token(self, authorization_code: str) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access token"""
        if not settings.TICKTICK_CLIENT_ID or not settings.TICKTICK_CLIENT_SECRET:
            return None

        try:
            response = self.session.post(
                f"{self.oauth_base_url}/token",
                data={
                    "grant_type": "authorization_code",
                    "code": authorization_code,
                    "client_id": settings.TICKTICK_CLIENT_ID,
                    "client_secret": settings.TICKTICK_CLIENT_SECRET,
                    "redirect_uri": settings.TICKTICK_REDIRECT_URI,
                }
            )

            if response.status_code == 200:
                token_data = response.json()
                logger.info("Successfully exchanged authorization code for access token")
                return token_data
            else:
                logger.error(f"Failed to exchange code for token: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error exchanging code for token: {str(e)}")
            return None

    async def get_projects(self) -> Optional[Dict[str, Any]]:
        """Get all projects from TickTick"""
        if not self.is_enabled():
            logger.debug("TickTick integration not enabled, skipping get projects")
            return None

        if not self._authenticate():
            return {
                "status": "error",
                "message": "Failed to authenticate with TickTick"
            }

        try:
            response = self.session.get(
                f"{self.base_url}/project",
                headers={"Authorization": f"Bearer {self._access_token}"}
            )

            if response.status_code == 200:
                projects_data = response.json()
                logger.info(f"Successfully fetched {len(projects_data)} projects from TickTick")
                return {
                    "status": "success",
                    "projects": projects_data,
                    "count": len(projects_data)
                }
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.error(f"Failed to fetch projects: {error_msg}")
                return {
                    "status": "error",
                    "message": f"Failed to fetch projects: {error_msg}"
                }

        except Exception as e:
            logger.error(f"Failed to fetch TickTick projects: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to fetch TickTick projects: {str(e)}"
            }

    async def get_tasks_simple(self) -> Optional[Dict[str, Any]]:
        """Get tasks from TickTick using a simple approach - get projects first then tasks from each"""
        if not self.is_enabled():
            logger.debug("TickTick integration not enabled, skipping get tasks")
            return None

        if not self._authenticate():
            return {
                "status": "error",
                "message": "Failed to authenticate with TickTick"
            }

        try:
            # First get projects to find task projects
            projects_result = await self.get_projects()
            if not projects_result or projects_result.get("status") != "success":
                return {
                    "status": "error",
                    "message": "Failed to fetch projects first"
                }

            all_tasks = []
            projects = projects_result.get("projects", [])

            # Filter to only task projects (not notes)
            task_projects = [p for p in projects if p.get("kind") == "TASK"]

            for project in task_projects:  # Limit to first 3 projects to avoid rate limiting
                project_id = project.get("id")
                project_name = project.get("name")
                logger.info(f"Fetching tasks from project: {project_name} (ID: {project_id})")

                try:
                    # Try to get tasks from this specific project using the direct endpoint
                    url = f"https://api.ticktick.com/open/v1/project/{project_id}/data"

                    # response = self.session.get(
                    #     url,
                    #     headers={"Authorization": f"Bearer {self._access_token}"}
                    # )

                    # if response.status_code == 200:
                    #     project_data = response.json()
                    #     logger.debug(f"Project '{project_name}' data keys: {list(project_data.keys())}")

                    #     # Check different possible task locations
                    #     tasks = project_data.get("tasks", [])
                    #     if not tasks:
                    #         tasks = project_data.get("data", {}).get("tasks", [])
                    #     if not tasks:
                    #         tasks = project_data.get("items", [])

                    #     logger.debug(f"Found {len(tasks)} tasks in project '{project_name}'")

                    #     for task in tasks:
                    #         formatted_task = {
                    #             "id": task.get("id"),
                    #             "title": task.get("title"),
                    #             "content": task.get("content", ""),
                    #             "status": task.get("status", 0),
                    #             "completed": task.get("status", 0) == 1,
                    #             "priority": task.get("priority", 0),
                    #             "project_id": project_id,
                    #             "project_name": project_name,
                    #             "created_time": task.get("createdTime"),
                    #             "modified_time": task.get("modifiedTime"),
                    #             "start_date": task.get("startDate"),
                    #             "due_date": task.get("dueDate"),
                    #             "is_all_day": task.get("isAllDay", False),
                    #             "timezone": task.get("timeZone"),
                    #             "tags": task.get("tags", []),
                    #             "reminders": task.get("reminders", [])
                    #         }
                    #         all_tasks.append(formatted_task)

                    #     logger.info(f"Fetched {len(tasks)} tasks from project '{project_name}'")
                    # else:
                    # logger.warning(f"Failed to fetch tasks from project '{project_name}': {response.status_code}")

                except Exception as e:
                    logger.error(f"Error fetching tasks from project '{project_name}': {str(e)}")
                    continue

            return {
                "status": "success",
                "tasks": all_tasks,
                "count": len(all_tasks),
                "projects_checked": len(task_projects)
            }

        except Exception as e:
            logger.error(f"Failed to fetch TickTick tasks: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to fetch TickTick tasks: {str(e)}"
            }

    async def get_tasks(self, project_id: Optional[str] = None, start_date: Optional[str] = None,
                        end_date: Optional[str] = None, limit: int = 50) -> Optional[Dict[str, Any]]:
        """
        Get tasks from TickTick

        Args:
            project_id: Optional project ID to filter tasks (if None, gets tasks from all projects)
            start_date: Optional start date in YYYY-MM-DD format
            end_date: Optional end date in YYYY-MM-DD format
            limit: Maximum number of tasks to fetch (default 50, max 100)
        """
        if not self.is_enabled():
            logger.debug("TickTick integration not enabled, skipping get tasks")
            return None

        if not self._authenticate():
            return {
                "status": "error",
                "message": "Failed to authenticate with TickTick"
            }

        try:
            # Build query parameters - start simple and add complexity gradually
            params = {}

            # Only add parameters that we know work
            if project_id:
                params["projectId"] = project_id

            # Try without date filters first as they might cause issues
            # if start_date:
            #     params["startDate"] = start_date
            # if end_date:
            #     params["endDate"] = end_date

            url = f"{self.base_url}/project/{project_id}/task/{task_id}"
            logger.debug(f"Fetching tasks from URL: {url} with params: {params}")

            response = self.session.get(
                url,
                headers={"Authorization": f"Bearer {self._access_token}"},
                params=params
            )

            logger.debug(f"TickTick API response: {response.status_code} - {response.text[:200]}...")

            if response.status_code == 200:
                tasks_data = response.json()
                logger.info(f"Successfully fetched {len(tasks_data)} tasks from TickTick")

                # Process and format the tasks
                formatted_tasks = []
                for task in tasks_data:
                    formatted_task = {
                        "id": task.get("id"),
                        "title": task.get("title"),
                        "content": task.get("content", ""),
                        "status": task.get("status", 0),  # 0 = active, 1 = completed
                        "completed": task.get("status", 0) == 1,
                        "priority": task.get("priority", 0),
                        "project_id": task.get("projectId"),
                        "created_time": task.get("createdTime"),
                        "modified_time": task.get("modifiedTime"),
                        "start_date": task.get("startDate"),
                        "due_date": task.get("dueDate"),
                        "is_all_day": task.get("isAllDay", False),
                        "timezone": task.get("timeZone"),
                        "tags": task.get("tags", []),
                        "reminders": task.get("reminders", [])
                    }
                    formatted_tasks.append(formatted_task)

                return {
                    "status": "success",
                    "tasks": formatted_tasks,
                    "count": len(formatted_tasks),
                    "project_id": project_id,
                    "filters": {
                        "start_date": start_date,
                        "end_date": end_date,
                        "limit": limit
                    }
                }
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.error(f"Failed to fetch tasks: {error_msg}")
                return {
                    "status": "error",
                    "message": f"Failed to fetch tasks: {error_msg}"
                }

        except Exception as e:
            logger.error(f"Failed to fetch TickTick tasks: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to fetch TickTick tasks: {str(e)}"
            }

    async def get_task_by_id(self, task_id: str, project_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific task by ID from TickTick"""
        if not self.is_enabled():
            logger.debug("TickTick integration not enabled, skipping get task by ID")
            return None

        if not self._authenticate():
            return {
                "status": "error",
                "message": "Failed to authenticate with TickTick"
            }

        try:
            response = self.session.get(
                f"{self.base_url}/project/{project_id}/task/{task_id}",
                headers={"Authorization": f"Bearer {self._access_token}"}
            )

            if response.status_code == 200:
                task_data = response.json()
                logger.info(f"Successfully fetched task {task_id} from TickTick")
                return task_data
                formatted_task = {
                    "id": task_data.get("id"),
                    "title": task_data.get("title"),
                    "content": task_data.get("content", ""),
                    "status": task_data.get("status", 0),
                    "completed": task_data.get("status", 0) == 1,
                    "priority": task_data.get("priority", 0),
                    "project_id": task_data.get("projectId"),
                    "created_time": task_data.get("createdTime"),
                    "modified_time": task_data.get("modifiedTime"),
                    "start_date": task_data.get("startDate"),
                    "due_date": task_data.get("dueDate"),
                    "is_all_day": task_data.get("isAllDay", False),
                    "timezone": task_data.get("timeZone"),
                    "tags": task_data.get("tags", []),
                    "reminders": task_data.get("reminders", [])
                }

                return {
                    "status": "success",
                    "task": formatted_task
                }
            else:
                error_msg = f"TickTick API returned {response.status_code}: {response.text}"
                logger.error(f"Failed to fetch task {task_id}: {error_msg}")
                return {
                    "status": "error",
                    "message": f"Failed to fetch task: {error_msg}"
                }

        except Exception as e:
            logger.error(f"Failed to fetch TickTick task {task_id}: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to fetch TickTick task: {str(e)}"
            }


# Global instance
ticktick_service = TickTickService()

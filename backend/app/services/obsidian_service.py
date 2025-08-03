import aiofiles
from pathlib import Path
from typing import Optional, Dict, Any
import json
from datetime import datetime, timedelta
import logging

from app.services.task_service import task_service
from app.utlis.config import settings

logger = logging.getLogger("app")


class ObsidianService:
    def __init__(self):
        self.vault_folder_path: Optional[Path] = None
        self.auto_sync_enabled = False
        self.last_sync: Optional[datetime] = None
        self._initialized = False

    async def initialize(self):
        """Initialize the service by loading settings"""
        if not self._initialized:
            await self._load_settings()
            self._initialized = True

    def _generate_weekly_filename(self) -> str:
        """Generate filename for current week (starting from Friday)"""
        today = datetime.now()
        # Calculate days back to Friday: Friday=4, so we want (weekday - 4) % 7 days back
        days_since_friday = (today.weekday() - 4) % 7
        start_of_week = today - timedelta(days=days_since_friday)  # Start from Friday

        # Format: weekly-planer-DD-MM-YYYY.md (using start of week date)
        filename = f"weekly-planer-{start_of_week.day}-{start_of_week.month}-{start_of_week.year}.md"
        return filename

    def _get_current_weekly_file_path(self) -> Optional[Path]:
        """Get the full path for the current week's file"""
        if not self.vault_folder_path:
            return None

        filename = self._generate_weekly_filename()
        return self.vault_folder_path / filename

    async def set_vault_path(self, folder_path: str) -> bool:
        """Set and validate Obsidian vault folder path"""
        await self.initialize()
        try:
            vault_folder_path = Path(folder_path).resolve()

            # Create directory if it doesn't exist
            vault_folder_path.mkdir(parents=True, exist_ok=True)

            # Verify it's a directory
            if not vault_folder_path.is_dir():
                return False

            self.vault_folder_path = vault_folder_path
            self.auto_sync_enabled = True

            # Save settings
            await self._save_settings()
            return True

        except Exception as e:
            print(f"Error setting vault folder path: {e}")
            return False

    async def _save_settings(self):
        """Save Obsidian settings to file"""
        settings_data = {
            "vault_folder_path": str(self.vault_folder_path) if self.vault_folder_path else None,
            "auto_sync_enabled": self.auto_sync_enabled,
            "last_sync": self.last_sync.isoformat() if self.last_sync else None
        }

        settings_file = Path(settings.SETTINGS_FILE)
        settings_file.parent.mkdir(parents=True, exist_ok=True)

        async with aiofiles.open(settings_file, 'w') as f:
            await f.write(json.dumps(settings_data, indent=2))

    async def _load_settings(self):
        """Load Obsidian settings from file"""
        try:
            settings_file = Path(settings.SETTINGS_FILE)
            if settings_file.exists():
                async with aiofiles.open(settings_file, 'r') as f:
                    content = await f.read()
                    data = json.loads(content)

                    # Support both old vault_path and new vault_folder_path for backwards compatibility
                    if data.get("vault_folder_path"):
                        self.vault_folder_path = Path(data["vault_folder_path"])
                    elif data.get("vault_path"):
                        # Convert old file path to folder path for backwards compatibility
                        old_path = Path(data["vault_path"])
                        self.vault_folder_path = old_path.parent if old_path.suffix else old_path

                    self.auto_sync_enabled = data.get("auto_sync_enabled", False)
                    if data.get("last_sync"):
                        self.last_sync = datetime.fromisoformat(data["last_sync"])

        except Exception as e:
            print(f"Error loading settings: {e}")

    async def generate_obsidian_content(self) -> str:
        """Generate markdown content for Obsidian"""
        # Get current date range (current week starting from Friday)
        today = datetime.now()
        # Calculate days back to Friday: Friday=4, so we want (weekday - 4) % 7 days back
        # If today is Friday (4), go back 0 days
        # If today is Saturday (5), go back 1 day
        # If today is Sunday (6), go back 2 days
        # If today is Monday (0), go back 3 days
        # If today is Tuesday (1), go back 4 days
        # If today is Wednesday (2), go back 5 days
        # If today is Thursday (3), go back 6 days
        days_since_friday = (today.weekday() - 4) % 7
        start_of_week = today - timedelta(days=days_since_friday)  # Start from Friday

        content = []
        content.append(f"# Week of {start_of_week.strftime('%B %d')} - {(start_of_week + timedelta(days=6)).strftime('%B %d, %Y')}")
        content.append("")
        content.append(f"*Auto-synced: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
        content.append("")

        # Add daily tasks for the week
        for i in range(7):
            date = start_of_week + timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')
            day_name = date.strftime('%A')

            content.append(f"## {day_name} {date.day}")
            content.append("")

            # Get weekly tasks for this day
            weekly_tasks = await task_service.get_weekly_tasks(date_str)

            if weekly_tasks:
                for task in weekly_tasks:
                    checkbox = "[x]" if task.completed else "[ ]"
                    task_line = f"- {checkbox} "

                    # Add time range if available
                    if task.from_time or task.to_time:
                        time_range = f"{task.from_time or '--:--'} - {task.to_time or '--:--'}"
                        task_line += f"**{time_range}** | "

                    task_line += task.text
                    content.append(task_line)
            else:
                content.append("- [ ] ")

            content.append("")

        # Add today's priority tasks
        daily_tasks = await task_service.get_tasks()
        if daily_tasks:
            content.append("## Today's Priority Tasks")
            content.append("")

            for task in daily_tasks[:3]:  # Top 3 priorities
                checkbox = "[x]" if task.completed else "[ ]"
                priority_emoji = "🔴" if task.priority == "high" else "🟡" if task.priority == "medium" else "🟢"
                content.append(f"- {checkbox} {priority_emoji} {task.text}")

            content.append("")

        # Add stats
        stats = await task_service.get_task_stats()
        content.append("## Weekly Stats")
        content.append("")
        content.append(f"- Daily Tasks Completed: {stats['completed_daily_tasks']}/{stats['total_daily_tasks']}")
        content.append(f"- Weekly Tasks Completed: {stats['completed_weekly_tasks']}/{stats['total_weekly_tasks']}")
        content.append(f"- Distractions Logged: {stats['total_distractions']}")
        content.append(f"- Focus Score: {stats['productivity_score']}")
        content.append("")
        content.append("---")
        content.append("*Auto-synced by Time Management Dashboard*")

        return "\n".join(content)

    async def sync_to_obsidian(self) -> Dict[str, Any]:
        """Sync current tasks to Obsidian file"""
        await self.initialize()
        if not self.vault_folder_path:
            return {"success": False, "error": "No vault folder path set"}

        try:
            content = await self.generate_obsidian_content()
            current_file_path = self._get_current_weekly_file_path()

            if not current_file_path:
                return {"success": False, "error": "Failed to generate file path"}

            # Write to file (create if doesn't exist)
            async with aiofiles.open(current_file_path, 'w', encoding='utf-8') as f:
                await f.write(content)

            self.last_sync = datetime.now()
            await self._save_settings()

            return {
                "success": True,
                "message": f"Synced to {current_file_path.name}",
                "file_path": str(current_file_path),
                "last_sync": self.last_sync.isoformat()
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def auto_sync_if_enabled(self):
        """Automatically sync if auto-sync is enabled"""
        if self.auto_sync_enabled and self.vault_folder_path:
            try:
                logger.debug("Auto-syncing to Obsidian...")
                await self.sync_to_obsidian()
                logger.debug("Auto-sync completed")
            except Exception as e:
                logger.error(f"Auto-sync failed: {e}")
        else:
            logger.warning(f"Obsidian Auto-sync is not enabled or vault folder path is not set ({self.vault_folder_path}, {self.auto_sync_enabled})")

    async def get_sync_status(self) -> Dict[str, Any]:
        """Get current sync status"""
        await self.initialize()
        current_file_path = self._get_current_weekly_file_path()
        return {
            "vault_path": str(self.vault_folder_path) if self.vault_folder_path else None,
            "vault_folder_path": str(self.vault_folder_path) if self.vault_folder_path else None,
            "current_file_name": self._generate_weekly_filename() if self.vault_folder_path else None,
            "current_file_path": str(current_file_path) if current_file_path else None,
            "auto_sync_enabled": self.auto_sync_enabled,
            "last_sync": self.last_sync.isoformat() if self.last_sync else None,
            "file_exists": current_file_path.exists() if current_file_path else False
        }

    async def import_from_obsidian(self) -> Dict[str, Any]:
        """Import tasks from Obsidian file"""
        current_file_path = self._get_current_weekly_file_path()

        if not current_file_path or not current_file_path.exists():
            return {"success": False, "error": "Obsidian file not found"}

        try:
            async with aiofiles.open(current_file_path, 'r', encoding='utf-8') as f:
                content = await f.read()

            # Parse markdown content and extract tasks
            imported_count = await self._parse_and_import_tasks(content)

            return {
                "success": True,
                "message": f"Imported {imported_count} tasks",
                "imported_count": imported_count
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _parse_and_import_tasks(self, content: str) -> int:
        """Parse markdown content and import tasks"""
        lines = content.split('\n')
        imported_count = 0
        current_date = None
        current_section = None

        for line in lines:
            line = line.strip()

            # Detect section headers
            if line.startswith('## '):
                if "Today's Priority Tasks" in line:
                    current_section = 'daily'
                else:
                    # Try to parse day header
                    day_match = line.replace('## ', '').split()
                    if len(day_match) >= 2:
                        current_section = 'weekly'
                        # You could implement date parsing here
                continue

            # Parse task lines
            if line.startswith('- [') and len(line) > 6:
                try:
                    checkbox_end = line.find(']')
                    if checkbox_end != -1:
                        is_completed = line[checkbox_end-1] == 'x'
                        task_text = line[checkbox_end+2:].strip()

                        # Remove time ranges and priority emojis for clean text
                        if ' | ' in task_text:
                            task_text = task_text.split(' | ', 1)[1]

                        task_text = task_text.replace('🔴 ', '').replace('🟡 ', '').replace('🟢 ', '')

                        if task_text and len(task_text) > 0:
                            # Import as daily task for now (could be enhanced)
                            from app.models.task import TaskCreate
                            task_data = TaskCreate(
                                text=task_text,
                                completed=is_completed,
                                priority="medium"
                            )
                            await task_service.create_task(task_data)
                            imported_count += 1

                except Exception as e:
                    print(f"Error parsing task line: {line}, error: {e}")
                    continue

        return imported_count

    def clear_settings(self):
        """Clear Obsidian settings"""
        self.vault_folder_path = None
        self.auto_sync_enabled = False
        self.last_sync = None


# Global instance
obsidian_service = ObsidianService()

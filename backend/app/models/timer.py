from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class TimerStatus(str, Enum):
    READY = "ready"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"

class PomodoroSettings(BaseModel):
    work_duration: int = Field(default=25, ge=1, le=60)  # Minutes
    break_duration: int = Field(default=5, ge=1, le=30)   # Minutes
    long_break_duration: int = Field(default=15, ge=1, le=60)  # Minutes
    sessions_until_long_break: int = Field(default=4, ge=1, le=10)

class TimerState(BaseModel):
    status: TimerStatus = TimerStatus.READY
    time_left: int = Field(default=1500)  # Seconds (25 minutes)
    is_break: bool = False
    sessions_completed: int = 0
    current_session: int = 1
    started_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    
class TimerUpdate(BaseModel):
    status: Optional[TimerStatus] = None
    time_left: Optional[int] = None
    sessions_completed: Optional[int] = None

class TimerStats(BaseModel):
    total_sessions: int = 0
    total_focus_time: int = 0  # Minutes
    average_session_length: float = 0.0
    sessions_today: int = 0
    current_streak: int = 0
    best_streak: int = 0
    last_session: Optional[datetime] = None

class SessionRecord(BaseModel):
    id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration: int  # Seconds
    was_completed: bool = False
    session_type: str = "work"  # "work" or "break"
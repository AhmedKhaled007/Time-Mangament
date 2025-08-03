from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class WeeklyTaskBase(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    completed: bool = False
    from_time: Optional[str] = Field(None, pattern=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')  # HH:MM format
    to_time: Optional[str] = Field(None, pattern=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')    # HH:MM format
    date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')  # YYYY-MM-DD format
    lunch_id: Optional[int] = None

class WeeklyTaskCreate(WeeklyTaskBase):
    pass

class WeeklyTaskUpdate(BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None
    from_time: Optional[str] = None
    to_time: Optional[str] = None
    lunch_id: Optional[int] = None

class WeeklyTask(WeeklyTaskBase):
    id: int
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    ticktick_id: Optional[str] = None

    class Config:
        from_attributes = True

class DistractionBase(BaseModel):
    text: str = Field(..., min_length=1, max_length=200)
    time: str = Field(default_factory=lambda: datetime.now().strftime("%H:%M:%S"))

class DistractionCreate(DistractionBase):
    pass

class Distraction(DistractionBase):
    id: int
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

class LunchIdeaBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class LunchIdeaCreate(LunchIdeaBase):
    pass

class LunchIdeaUpdate(BaseModel):
    name: Optional[str] = None

class LunchIdea(LunchIdeaBase):
    id: int
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

class DailyLunchUpdate(BaseModel):
    lunch_id: Optional[int] = None
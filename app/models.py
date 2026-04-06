from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class Institute(BaseModel):
    id: int
    name: str
    url: str


class Group(BaseModel):
    id: int
    name: str


class Teacher(BaseModel):
    id: int
    name: str


class Lesson(BaseModel):
    time_start: str
    time_end: str
    subject: str
    lesson_type: str
    room: Optional[str] = None
    teachers: List[dict] = []
    groups: List[dict] = []
    subgroup: Optional[str] = None


class Day(BaseModel):
    weekday: str
    weekday_num: int
    date: Optional[str] = None
    date_iso: Optional[str] = None
    lessons: List[Lesson] = []


class WeekSchedule(BaseModel):
    week_number: Optional[int] = None
    week_start_date: Optional[str] = None
    week_end_date: Optional[str] = None
    entity_name: str
    entity_type: Literal["group", "teacher"]
    days: List[Day] = []
    prev_week: Optional[int] = None
    next_week: Optional[int] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


class ApiResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
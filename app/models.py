from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class InstituteOut(BaseModel):
    id: int = Field(..., description="facultyId from ssau.ru/rasp/faculty/<id>")
    name: str
    url: str


class GroupOut(BaseModel):
    id: int = Field(..., description="groupId")
    name: str
    url: Optional[str] = None


class TeacherOut(BaseModel):
    id: int = Field(..., description="staffId")
    name: str
    url: Optional[str] = None


class TeacherRef(BaseModel):
    staff_id: Optional[int] = None
    name: str


class GroupRef(BaseModel):
    group_id: Optional[int] = None
    name: str


class LessonOut(BaseModel):
    time_start: str
    time_end: str

    subject: str
    lesson_type: str

    room: Optional[str] = None
    teachers: List[TeacherRef] = Field(default_factory=list)
    groups: List[GroupRef] = Field(default_factory=list)

    subgroup: Optional[str] = None
    comment: Optional[str] = None


class DayOut(BaseModel):
    weekday: str
    date: Optional[str] = Field(default=None, description="DD.MM.YYYY как на ssau.ru")
    date_iso: Optional[str] = Field(default=None, description="YYYY-MM-DD")
    lessons: List[LessonOut] = Field(default_factory=list)


class TimeSlotOut(BaseModel):
    time_start: str
    time_end: str


class ScheduleOut(BaseModel):
    week_number: Optional[int] = None
    week_label: Optional[str] = None
    week_dates: Optional[str] = None
    week_start_date: Optional[str] = Field(default=None, description="YYYY-MM-DD")
    week_end_date: Optional[str] = Field(default=None, description="YYYY-MM-DD")

    prev_week: Optional[int] = None
    next_week: Optional[int] = None

    mode: Literal["group", "teacher"]
    entity_name: str

    # for correct rendering of empty cells on UI
    time_slots: List[TimeSlotOut] = Field(default_factory=list)

    days: List[DayOut] = Field(default_factory=list)

    source_url: str
    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class InstitutesResponse(BaseModel):
    institutes: List[InstituteOut]
    source_url: str
    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class GroupsResponse(BaseModel):
    institute_id: int
    course: Optional[int] = None
    available_courses: List[int] = Field(default_factory=list)
    groups: List[GroupOut] = Field(default_factory=list)
    source_url: str
    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class TeachersResponse(BaseModel):
    q: str
    teachers: List[TeacherOut]
    source_url: str
    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class WeekCurrentResponse(BaseModel):
    week_number: Optional[int] = None
    week_label: Optional[str] = None
    week_dates: Optional[str] = None
    week_start_date: Optional[str] = None
    week_end_date: Optional[str] = None
    source_url: str
    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None

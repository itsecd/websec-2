from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class InstituteOut(BaseModel):
    """One faculty/institute entry from ssau.ru."""

    id: int = Field(..., description="facultyId from ssau.ru/rasp/faculty/<id>")
    name: str
    url: str


class GroupOut(BaseModel):
    """Study group (identifier from the ``groupId`` query param)."""

    id: int = Field(..., description="groupId")
    name: str
    url: Optional[str] = None


class TeacherOut(BaseModel):
    """Teacher from search (``staffId`` identifier)."""

    id: int = Field(..., description="staffId")
    name: str
    url: Optional[str] = None


class TeacherRef(BaseModel):
    """Teacher reference inside a timetable cell (name plus id when present in URL)."""

    staff_id: Optional[int] = None
    name: str


class GroupRef(BaseModel):
    """Group reference inside a cell (stream, multiple groups, etc.)."""

    group_id: Optional[int] = None
    name: str


class LessonOut(BaseModel):
    """Single lesson in the grid: time, subject, type, room, links, subgroup."""

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
    """One day column: weekday label, date, lessons that day."""

    weekday: str
    date: Optional[str] = Field(default=None, description="DD.MM.YYYY как на ssau.ru")
    date_iso: Optional[str] = Field(default=None, description="YYYY-MM-DD")
    lessons: List[LessonOut] = Field(default_factory=list)


class TimeSlotOut(BaseModel):
    """Lesson interval from the left-hand time column (start–end)."""

    time_start: str
    time_end: str


class ScheduleOut(BaseModel):
    """Normalized one-week timetable for a group or teacher."""

    week_number: Optional[int] = None
    week_label: Optional[str] = None
    week_dates: Optional[str] = None
    week_start_date: Optional[str] = Field(default=None, description="YYYY-MM-DD")
    week_end_date: Optional[str] = Field(default=None, description="YYYY-MM-DD")

    prev_week: Optional[int] = None
    next_week: Optional[int] = None

    mode: Literal["group", "teacher"]
    entity_name: str

    time_slots: List[TimeSlotOut] = Field(default_factory=list)

    days: List[DayOut] = Field(default_factory=list)

    source_url: str
    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class InstitutesResponse(BaseModel):
    """Response body for ``GET /api/institutes``."""

    institutes: List[InstituteOut]
    source_url: str
    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class GroupsResponse(BaseModel):
    """Response body for ``GET /api/groups`` (courses and/or group list)."""

    institute_id: int
    course: Optional[int] = None
    available_courses: List[int] = Field(default_factory=list)
    groups: List[GroupOut] = Field(default_factory=list)
    source_url: str
    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class TeachersResponse(BaseModel):
    """Response body for ``GET /api/teachers`` (search results)."""

    q: str
    teachers: List[TeacherOut]
    source_url: str
    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class WeekCurrentResponse(BaseModel):
    """Current week metadata for UI sync (``GET /api/weeks/current``)."""

    week_number: Optional[int] = None
    week_label: Optional[str] = None
    week_dates: Optional[str] = None
    week_start_date: Optional[str] = None
    week_end_date: Optional[str] = None
    source_url: str
    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class ErrorResponse(BaseModel):
    """Uniform error payload for 4xx/5xx responses (not always via ``response_model``)."""

    error: str
    detail: Optional[str] = None

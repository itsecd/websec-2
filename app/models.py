from typing import List, Optional, Tuple
from dataclasses import dataclass

@dataclass
class Lesson:
    time_start: str
    time_end: str
    subject: str
    lesson_type: str
    room: Optional[str]
    teachers: List[dict]
    groups: List[dict]
    subgroup: Optional[str]
    comment: Optional[str]

@dataclass
class DaySchedule:
    weekday: str
    date: Optional[str]
    date_iso: Optional[str]
    lessons: List[Lesson]

@dataclass
class WeekSchedule:
    week_number: Optional[int]
    week_label: Optional[str]
    week_dates: Optional[str]
    week_start_date: Optional[str]
    week_end_date: Optional[str]
    prev_week: Optional[int]
    next_week: Optional[int]
    entity_name: str
    days: List[DaySchedule]
    time_slots: List[Tuple[str, str]]
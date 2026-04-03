from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup


@dataclass
class ParsedLesson:
    """One lesson parsed from ``div.schedule__lesson`` (time comes from the row slot)."""

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
class ParsedDay:
    """One day column: weekday label, date, and accumulated lessons."""

    weekday: str
    date: Optional[str]
    date_iso: Optional[str]
    lessons: List[ParsedLesson]


@dataclass
class ParsedSchedule:
    """Full schedule for the displayed week plus unique lesson time intervals."""

    week_number: Optional[int]
    week_label: Optional[str]
    week_dates: Optional[str]
    week_start_date: Optional[str]
    week_end_date: Optional[str]
    prev_week: Optional[int]
    next_week: Optional[int]
    entity_name: str
    days: List[ParsedDay]
    time_slots: List[Tuple[str, str]]  


def _text(el) -> str:
    """Concatenate text from a BeautifulSoup node with space separators and strip."""
    if not el:
        return ""
    return el.get_text(" ", strip=True)


def _parse_ddmmyyyy(s: str) -> Optional[datetime]:
    """Parse a DD.MM.YYYY date string; return None on failure."""
    s = (s or "").strip()
    try:
        return datetime.strptime(s, "%d.%m.%Y")
    except Exception:
        return None


def _to_iso(dt: Optional[datetime]) -> Optional[str]:
    """Format a datetime as YYYY-MM-DD."""
    return dt.date().isoformat() if dt else None


def _extract_week_from_href(href: str) -> Optional[int]:
    """Read ``selectedWeek`` from prev/next week navigation link query strings."""
    if not href:
        return None
    try:
        q = parse_qs(urlparse(href).query)
        if "selectedWeek" in q:
            return int(q["selectedWeek"][0])
    except Exception:
        return None
    return None


def parse_schedule(html: str) -> ParsedSchedule:
    """
    Parse group or teacher timetable HTML from ssau.ru.

    Container lookup tolerates ``div.container.timetable`` or any div whose class
    contains ``timetable``. Grid: ``.schedule__items`` with day headers, then
    repeating rows of ``schedule__time`` plus N day cells; a cell may hold several
    ``.schedule__lesson`` nodes for different subgroups.

    Args:
        html: Response body for ``...?groupId=`` or ``...?staffId=`` (with optional week params).

    Returns:
        ``ParsedSchedule`` with days, time slots, and week metadata filled in.

    Raises:
        ValueError: Timetable container or grid structure is missing or invalid.
    """
    soup = BeautifulSoup(html, "lxml")

    container = soup.select_one("div.container.timetable") or soup.find("div", class_=re.compile(r"\btimetable\b"))
    if not container:
        raise ValueError("SSAU: не найден контейнер timetable")

    entity_name = ""
    h2 = container.find("h2")
    if h2:
        entity_name = _text(h2)
    if not entity_name:
        h1 = container.find("h1")
        if h1:
            t = _text(h1)
            entity_name = t.split(",", 1)[-1].strip() if "," in t else t.strip()
    if not entity_name:
        entity_name = "—"

    week_label = _text(container.select_one(".week-nav-current_week"))
    week_number = None
    if week_label:
        m = re.search(r"(\d+)", week_label)
        if m:
            week_number = int(m.group(1))

    prev_week = _extract_week_from_href((container.select_one(".week-nav-prev") or {}).get("href") if container.select_one(".week-nav-prev") else "")
    next_week = _extract_week_from_href((container.select_one(".week-nav-next") or {}).get("href") if container.select_one(".week-nav-next") else "")

    schedule_items = container.select_one(".schedule .schedule__items") or container.select_one(".schedule__items")
    if not schedule_items:
        raise ValueError("SSAU: не найден блок расписания schedule__items")

    children = schedule_items.find_all(recursive=False)
    if not children:
        raise ValueError("SSAU: пустой блок schedule__items")

    first_time_idx = None
    for idx, ch in enumerate(children):
        if "schedule__time" in (ch.get("class") or []):
            first_time_idx = idx
            break

    header_cells: List = []
    i = 0
    while i < len(children):
        cls = children[i].get("class") or []
        if "schedule__head" in cls:
            header_cells.append(children[i])
            i += 1
        else:
            break

    if len(header_cells) < 2:
        if first_time_idx is None or first_time_idx < 2:
            raise ValueError("SSAU: не удалось извлечь заголовки дней недели (нет schedule__head и нет schedule__time)")
        header_cells = children[:first_time_idx]
        i = first_time_idx

    if first_time_idx is not None:
        i = first_time_idx

    if len(header_cells) < 2:
        raise ValueError("SSAU: слишком мало заголовков в расписании")
    day_headers = header_cells[1:]

    days: List[ParsedDay] = []
    for dh in day_headers:
        text_dh = _text(dh)

        date_match = re.search(r"(\d{2}\.\d{2}\.\d{4})", text_dh)
        date_str = date_match.group(1) if date_match else None
        dt = _parse_ddmmyyyy(date_str or "") if date_str else None

        weekday = text_dh.replace(date_str, "").strip() if date_str else text_dh.strip()
        weekday = re.sub(r"\s+", " ", weekday)

        days.append(ParsedDay(weekday=weekday or "—", date=date_str, date_iso=_to_iso(dt), lessons=[]))

    time_slots: List[Tuple[str, str]] = []

    while i < len(children):
        time_block = children[i]
        i += 1

        if "schedule__time" not in (time_block.get("class") or []):
            continue

        time_start, time_end = _parse_time_block(time_block)
        if time_start and time_end:
            if not time_slots or time_slots[-1] != (time_start, time_end):
                time_slots.append((time_start, time_end))

        for day_idx in range(len(days)):
            if i >= len(children):
                break
            cell = children[i]
            i += 1

            lessons = _parse_cell_lessons(cell, time_start=time_start, time_end=time_end)
            if lessons:
                days[day_idx].lessons.extend(lessons)

    parsed_dates = [_parse_ddmmyyyy(d.date or "") for d in days if d.date]
    parsed_dates = [d for d in parsed_dates if d]
    week_dates = None
    week_start = None
    week_end = None
    if parsed_dates:
        week_start_dt = min(parsed_dates)
        week_end_dt = max(parsed_dates)
        week_start = _to_iso(week_start_dt)
        week_end = _to_iso(week_end_dt)
        week_dates = f"{week_start_dt.strftime('%d.%m.%Y')} - {week_end_dt.strftime('%d.%m.%Y')}"

    return ParsedSchedule(
        week_number=week_number,
        week_label=week_label or (f"{week_number} неделя" if week_number is not None else None),
        week_dates=week_dates,
        week_start_date=week_start,
        week_end_date=week_end,
        prev_week=prev_week,
        next_week=next_week,
        entity_name=entity_name,
        days=days,
        time_slots=time_slots,
    )


def _parse_time_block(time_block) -> Tuple[str, str]:
    """
    Extract lesson start and end times from a ``.schedule__time`` block.

    Fallback: first two H:MM / HH:MM matches anywhere in the block text.
    """
    times = [t.get_text(" ", strip=True) for t in time_block.select(".schedule__time-item")]
    times = [t for t in times if re.search(r"\b\d{1,2}:\d{2}\b", t)]
    if len(times) >= 2:
        return times[0], times[1]

    tt = _text(time_block)
    m = re.findall(r"\b\d{1,2}:\d{2}\b", tt)
    m = (m + ["", ""])[:2]
    return m[0], m[1]


def _parse_cell_lessons(cell, time_start: str, time_end: str) -> List[ParsedLesson]:
    """
    All lessons in one day cell (multiple entries mean different subgroups/options).

    Fills subject, type, room, teacher/group lists, and subgroup caption.
    """
    lesson_divs = cell.find_all("div", class_="schedule__lesson", recursive=False)
    if not lesson_divs:
        return []

    out: List[ParsedLesson] = []
    for ld in lesson_divs:
        lesson_type = _text(ld.select_one(".schedule__lesson-type-chip")) or _text(ld.select_one(".schedule__lesson-type"))
        subject = _text(ld.select_one(".schedule__discipline")) or _text(ld.select_one(".schedule__discipline-name"))
        room = _text(ld.select_one(".schedule__place")) or None

        teachers = _parse_teachers(ld)
        groups = _parse_groups(ld)

        subgroup = _parse_subgroup(ld)
        comment = _text(ld.select_one(".schedule__comment")) or None

        if comment and re.search(r"Подгрупп", comment, flags=re.IGNORECASE):
            comment = None

        if not subject:
            bt = ld.select_one(".body-text")
            subject = _text(bt)

        if not lesson_type:
            lesson_type = "—"

        out.append(
            ParsedLesson(
                time_start=time_start,
                time_end=time_end,
                subject=subject or "—",
                lesson_type=lesson_type,
                room=room,
                teachers=teachers,
                groups=groups,
                subgroup=subgroup,
                comment=comment,
            )
        )

    return out


def _parse_teachers(lesson_div) -> List[dict]:
    """
    Teachers as ``{"staff_id": int | None, "name": str}``.

    ``staffId=`` links populate id; otherwise only block text; duplicates collapse.
    """
    teacher_block = lesson_div.select_one(".schedule__teacher")
    if not teacher_block:
        return []

    teachers: List[dict] = []
    links = teacher_block.select('a[href*="staffId="]')
    for a in links:
        href = a.get("href") or ""
        name = _text(a)
        staff_id = None
        try:
            q = parse_qs(urlparse(href).query)
            if "staffId" in q:
                staff_id = int(q["staffId"][0])
        except Exception:
            staff_id = None
        if name:
            teachers.append({"staff_id": staff_id, "name": name})

    if not teachers:
        name = _text(teacher_block)
        if name:
            teachers.append({"staff_id": None, "name": name})

    uniq = {}
    for t in teachers:
        key = (t.get("staff_id"), t.get("name"))
        uniq[key] = t
    return list(uniq.values())


def _parse_groups(lesson_div) -> List[dict]:
    """
    Groups/stream from ``.schedule__groups`` via ``groupId=`` links or plain text.

    Returns:
        List of ``{"group_id": int | None, "name": str}`` without duplicates.
    """
    groups_block = lesson_div.select_one(".schedule__groups")
    if not groups_block:
        return []
    groups: List[dict] = []

    links = groups_block.select('a[href*="groupId="]')
    for a in links:
        href = a.get("href") or ""
        name = _text(a)
        group_id = None
        try:
            q = parse_qs(urlparse(href).query)
            if "groupId" in q:
                group_id = int(q["groupId"][0])
        except Exception:
            group_id = None
        if name:
            groups.append({"group_id": group_id, "name": name})

    if not groups:
        text = _text(groups_block)
        if text:
            for part in re.split(r"\s{2,}|\n|,|;", text):
                p = part.strip()
                if p:
                    groups.append({"group_id": None, "name": p})

    uniq = {}
    for g in groups:
        key = (g.get("group_id"), g.get("name"))
        uniq[key] = g
    return list(uniq.values())


def _parse_subgroup(lesson_div) -> Optional[str]:
    """Subgroup label from ``span.caption-text`` when it marks a subgroup assignment."""
    for span in lesson_div.select("span.caption-text"):
        t = _text(span)
        if not t:
            continue
        if re.search(r"Подгрупп", t, flags=re.IGNORECASE):
            m = re.search(r":\s*(.+)$", t)
            if m:
                return m.group(1).strip()
            parts = t.split()
            return parts[-1].strip() if parts else None
    return None

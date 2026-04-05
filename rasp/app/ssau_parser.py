import re
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Tuple
from urllib.parse import parse_qs, urlparse
from bs4 import BeautifulSoup


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


def _get_text(element) -> str:
    if not element:
        return ""
    return element.get_text(" ", strip=True)


def _parse_date(date_str: str) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip(), "%d.%m.%Y")
    except ValueError:
        return None


def _extract_week_number(href: str) -> Optional[int]:
    if not href:
        return None
    try:
        query = parse_qs(urlparse(href).query)
        if "selectedWeek" in query:
            return int(query["selectedWeek"][0])
    except (ValueError, TypeError):
        pass
    return None


def _get_time_from_block(time_block) -> Tuple[str, str]:
    time_items = time_block.select(".schedule__time-item")
    times = [item.get_text(" ", strip=True) for item in time_items]
    times = [t for t in times if re.search(r"\d{1,2}:\d{2}", t)]
    
    if len(times) >= 2:
        return times[0], times[1]
    
    all_times = re.findall(r"\b(\d{1,2}:\d{2})\b", _get_text(time_block))
    if len(all_times) >= 2:
        return all_times[0], all_times[1]
    
    return "", ""


def _parse_teachers(lesson_block) -> List[dict]:
    teacher_block = lesson_block.select_one(".schedule__teacher")
    if not teacher_block:
        return []
    
    result = []
    for link in teacher_block.select('a[href*="staffId="]'):
        name = _get_text(link)
        staff_id = None
        try:
            query = parse_qs(urlparse(link.get("href", "")).query)
            if "staffId" in query:
                staff_id = int(query["staffId"][0])
        except (ValueError, TypeError):
            pass
        if name:
            result.append({"staff_id": staff_id, "name": name})
    
    if not result:
        name = _get_text(teacher_block)
        if name:
            result.append({"staff_id": None, "name": name})
    
    unique = {}
    for t in result:
        key = (t.get("staff_id"), t.get("name"))
        unique[key] = t
    return list(unique.values())


def _parse_groups(lesson_block) -> List[dict]:
    groups_block = lesson_block.select_one(".schedule__groups")
    if not groups_block:
        return []
    
    result = []
    for link in groups_block.select('a[href*="groupId="]'):
        name = _get_text(link)
        group_id = None
        try:
            query = parse_qs(urlparse(link.get("href", "")).query)
            if "groupId" in query:
                group_id = int(query["groupId"][0])
        except (ValueError, TypeError):
            pass
        if name:
            result.append({"group_id": group_id, "name": name})
    
    if not result:
        text = _get_text(groups_block)
        if text:
            for part in re.split(r"[,\n;]{1,}", text):
                part = part.strip()
                if part:
                    result.append({"group_id": None, "name": part})
    
    unique = {}
    for g in result:
        key = (g.get("group_id"), g.get("name"))
        unique[key] = g
    return list(unique.values())


def _parse_subgroup(lesson_block) -> Optional[str]:
    for span in lesson_block.select("span.caption-text"):
        text = _get_text(span)
        if not text:
            continue
        if "подгрупп" in text.lower():
            match = re.search(r":\s*(.+)$", text)
            if match:
                return match.group(1).strip()
            parts = text.split()
            if parts:
                return parts[-1].strip()
    return None


def _parse_lesson_cell(cell, time_start: str, time_end: str) -> List[Lesson]:
    lessons_in_cell = cell.find_all("div", class_="schedule__lesson", recursive=False)
    if not lessons_in_cell:
        return []
    
    result = []
    for lesson_elem in lessons_in_cell:
        lesson_type = _get_text(lesson_elem.select_one(".schedule__lesson-type-chip")) or \
                      _get_text(lesson_elem.select_one(".schedule__lesson-type")) or "—"
        
        subject = _get_text(lesson_elem.select_one(".schedule__discipline")) or \
                  _get_text(lesson_elem.select_one(".schedule__discipline-name")) or "—"
        
        room = _get_text(lesson_elem.select_one(".schedule__place")) or None
        
        teachers = _parse_teachers(lesson_elem)
        groups = _parse_groups(lesson_elem)
        subgroup = _parse_subgroup(lesson_elem)
        
        comment = _get_text(lesson_elem.select_one(".schedule__comment")) or None
        if comment and "подгрупп" in comment.lower():
            comment = None
        
        result.append(Lesson(
            time_start=time_start,
            time_end=time_end,
            subject=subject,
            lesson_type=lesson_type,
            room=room,
            teachers=teachers,
            groups=groups,
            subgroup=subgroup,
            comment=comment,
        ))
    
    return result


def parse_schedule(html: str) -> WeekSchedule:
    soup = BeautifulSoup(html, "lxml")
    
    container = soup.select_one("div.container.timetable")
    if not container:
        container = soup.find("div", class_=re.compile(r"\btimetable\b"))
    if not container:
        raise ValueError("Не найден контейнер с расписанием")
    
    entity_name = ""
    h2 = container.find("h2")
    if h2:
        entity_name = _get_text(h2)
    if not entity_name:
        h1 = container.find("h1")
        if h1:
            text = _get_text(h1)
            if "," in text:
                entity_name = text.split(",", 1)[-1].strip()
            else:
                entity_name = text.strip()
    if not entity_name:
        entity_name = "—"
    
    week_label = _get_text(container.select_one(".week-nav-current_week"))
    week_number = None
    if week_label:
        match = re.search(r"(\d+)", week_label)
        if match:
            week_number = int(match.group(1))
    
    prev_week = None
    next_week = None
    prev_link = container.select_one(".week-nav-prev")
    if prev_link:
        prev_week = _extract_week_number(prev_link.get("href", ""))
    next_link = container.select_one(".week-nav-next")
    if next_link:
        next_week = _extract_week_number(next_link.get("href", ""))
    
    schedule_grid = container.select_one(".schedule .schedule__items") or \
                    container.select_one(".schedule__items")
    if not schedule_grid:
        raise ValueError("Не найден блок schedule__items")
    
    rows = schedule_grid.find_all(recursive=False)
    if not rows:
        raise ValueError("Пустой блок расписания")
    
    first_time_index = None
    for idx, row in enumerate(rows):
        if "schedule__time" in (row.get("class") or []):
            first_time_index = idx
            break
    
    headers = []
    row_idx = 0
    while row_idx < len(rows):
        row_class = rows[row_idx].get("class") or []
        if "schedule__head" in row_class:
            headers.append(rows[row_idx])
            row_idx += 1
        else:
            break
    
    if len(headers) < 2 and first_time_index is not None:
        headers = rows[:first_time_index]
        row_idx = first_time_index
    
    if first_time_index is not None:
        row_idx = first_time_index
    
    if len(headers) < 2:
        raise ValueError("Не удалось найти заголовки дней недели")
    
    day_headers = headers[1:]
    
    days: List[DaySchedule] = []
    for header in day_headers:
        header_text = _get_text(header)
        
        date_match = re.search(r"(\d{2}\.\d{2}\.\d{4})", header_text)
        date_str = date_match.group(1) if date_match else None
        dt = _parse_date(date_str) if date_str else None
        
        weekday = header_text.replace(date_str, "").strip() if date_str else header_text.strip()
        weekday = re.sub(r"\s+", " ", weekday) or "—"
        
        days.append(DaySchedule(
            weekday=weekday,
            date=date_str,
            date_iso=dt.date().isoformat() if dt else None,
            lessons=[]
        ))
    
    time_slots: List[Tuple[str, str]] = []
    
    while row_idx < len(rows):
        time_row = rows[row_idx]
        row_idx += 1
        
        if "schedule__time" not in (time_row.get("class") or []):
            continue
        
        time_start, time_end = _get_time_from_block(time_row)
        if time_start and time_end:
            if not time_slots or time_slots[-1] != (time_start, time_end):
                time_slots.append((time_start, time_end))
        
        for day_index in range(len(days)):
            if row_idx >= len(rows):
                break
            cell = rows[row_idx]
            row_idx += 1
            
            lessons = _parse_lesson_cell(cell, time_start, time_end)
            if lessons:
                days[day_index].lessons.extend(lessons)
    
    valid_dates = [dt for d in days if d.date for dt in [_parse_date(d.date)] if dt]
    week_dates = None
    week_start = None
    week_end = None
    
    if valid_dates:
        min_date = min(valid_dates)
        max_date = max(valid_dates)
        week_start = min_date.date().isoformat()
        week_end = max_date.date().isoformat()
        week_dates = f"{min_date.strftime('%d.%m.%Y')} - {max_date.strftime('%d.%m.%Y')}"
    
    return WeekSchedule(
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
import re
from datetime import datetime
from bs4 import BeautifulSoup
from typing import List, Tuple, Optional
from .models import Lesson, DaySchedule, WeekSchedule

def parse_schedule(html: str):
    """Парсит HTML с расписанием и возвращает структурированные данные"""
    soup = BeautifulSoup(html, "lxml")
    
    container = soup.select_one("div.container.timetable")
    if not container:
        container = soup.find("div", class_=re.compile(r"\btimetable\b"))
    if not container:
        raise ValueError("Не найден контейнер с расписанием")
    
    entity_name = ""
    h2 = container.find("h2")
    if h2:
        entity_name = h2.get_text(" ", strip=True)
    if not entity_name:
        h1 = container.find("h1")
        if h1:
            text = h1.get_text(" ", strip=True)
            if "," in text:
                entity_name = text.split(",", 1)[-1].strip()
            else:
                entity_name = text.strip()
    if not entity_name:
        entity_name = "—"
    
    week_label = None
    week_elem = container.select_one(".week-nav-current_week")
    if week_elem:
        week_label = week_elem.get_text(" ", strip=True)
    
    week_number = None
    if week_label:
        match = re.search(r"(\d+)", week_label)
        if match:
            week_number = int(match.group(1))
    
    prev_week = None
    next_week = None
    prev_link = container.select_one(".week-nav-prev")
    if prev_link:
        href = prev_link.get("href", "")
        match = re.search(r"selectedWeek=(\d+)", href)
        if match:
            prev_week = int(match.group(1))
    
    next_link = container.select_one(".week-nav-next")
    if next_link:
        href = next_link.get("href", "")
        match = re.search(r"selectedWeek=(\d+)", href)
        if match:
            next_week = int(match.group(1))
    
    schedule_grid = container.select_one(".schedule .schedule__items") or \
                    container.select_one(".schedule__items")
    if not schedule_grid:
        raise ValueError("Не найден блок schedule__items")
    
    rows = schedule_grid.find_all(recursive=False)
    if not rows:
        raise ValueError("Пустой блок расписания")
    
    headers = []
    row_idx = 0
    while row_idx < len(rows):
        row_class = rows[row_idx].get("class") or []
        if "schedule__head" in row_class:
            headers.append(rows[row_idx])
            row_idx += 1
        else:
            break
    
    if len(headers) < 2:
        raise ValueError("Не удалось найти заголовки дней недели")
    
    day_headers = headers[1:]
    
    days: List[DaySchedule] = []
    for header in day_headers:
        header_text = header.get_text(" ", strip=True)
        
        date_match = re.search(r"(\d{2}\.\d{2}\.\d{4})", header_text)
        date_str = date_match.group(1) if date_match else None
        
        dt = None
        if date_str:
            try:
                dt = datetime.strptime(date_str.strip(), "%d.%m.%Y")
            except ValueError:
                pass
        
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
        
        time_items = time_row.select(".schedule__time-item")
        times = [item.get_text(" ", strip=True) for item in time_items]
        times = [t for t in times if re.search(r"\d{1,2}:\d{2}", t)]
        
        time_start = times[0] if len(times) >= 2 else ""
        time_end = times[1] if len(times) >= 2 else ""
        
        if time_start and time_end:
            if not time_slots or time_slots[-1] != (time_start, time_end):
                time_slots.append((time_start, time_end))
        
        for day_index in range(len(days)):
            if row_idx >= len(rows):
                break
            cell = rows[row_idx]
            row_idx += 1
            
            lessons_in_cell = cell.find_all("div", class_="schedule__lesson", recursive=False)
            
            for lesson_elem in lessons_in_cell:
                lesson_type = lesson_elem.select_one(".schedule__lesson-type-chip")
                if not lesson_type:
                    lesson_type = lesson_elem.select_one(".schedule__lesson-type")
                lesson_type_text = lesson_type.get_text(" ", strip=True) if lesson_type else "—"
                
                subject_elem = lesson_elem.select_one(".schedule__discipline")
                if not subject_elem:
                    subject_elem = lesson_elem.select_one(".schedule__discipline-name")
                subject = subject_elem.get_text(" ", strip=True) if subject_elem else "—"
                
                room_elem = lesson_elem.select_one(".schedule__place")
                room = room_elem.get_text(" ", strip=True) if room_elem else None
                
                teachers = []
                teacher_block = lesson_elem.select_one(".schedule__teacher")
                if teacher_block:
                    for link in teacher_block.select('a[href*="staffId="]'):
                        name = link.get_text(" ", strip=True)
                        staff_id = None
                        match = re.search(r"staffId=(\d+)", link.get("href", ""))
                        if match:
                            staff_id = int(match.group(1))
                        if name:
                            teachers.append({"staff_id": staff_id, "name": name})
                
                groups = []
                groups_block = lesson_elem.select_one(".schedule__groups")
                if groups_block:
                    for link in groups_block.select('a[href*="groupId="]'):
                        name = link.get_text(" ", strip=True)
                        group_id = None
                        match = re.search(r"groupId=(\d+)", link.get("href", ""))
                        if match:
                            group_id = int(match.group(1))
                        if name:
                            groups.append({"group_id": group_id, "name": name})
                
                subgroup = None
                for span in lesson_elem.select("span.caption-text"):
                    text = span.get_text(" ", strip=True)
                    if text and "подгрупп" in text.lower():
                        match = re.search(r":\s*(.+)$", text)
                        if match:
                            subgroup = match.group(1).strip()
                        else:
                            parts = text.split()
                            if parts:
                                subgroup = parts[-1].strip()
                
                comment = None
                comment_elem = lesson_elem.select_one(".schedule__comment")
                if comment_elem:
                    comment = comment_elem.get_text(" ", strip=True)
                    if comment and "подгрупп" in comment.lower():
                        comment = None
                
                lesson = Lesson(
                    time_start=time_start,
                    time_end=time_end,
                    subject=subject,
                    lesson_type=lesson_type_text,
                    room=room,
                    teachers=teachers,
                    groups=groups,
                    subgroup=subgroup,
                    comment=comment
                )
                days[day_index].lessons.append(lesson)
    
    valid_dates = []
    for d in days:
        if d.date:
            try:
                dt = datetime.strptime(d.date, "%d.%m.%Y")
                valid_dates.append(dt)
            except ValueError:
                pass
    
    week_dates = None
    week_start = None
    week_end = None
    
    if valid_dates:
        min_date = min(valid_dates)
        max_date = max(valid_dates)
        week_start = min_date.date().isoformat()
        week_end = max_date.date().isoformat()
        week_dates = f"{min_date.strftime('%d.%m.%Y')} - {max_date.strftime('%d.%m.%Y')}"
    
    return {
        "week_number": week_number,
        "week_label": week_label or (f"{week_number} неделя" if week_number is not None else None),
        "week_dates": week_dates,
        "week_start_date": week_start,
        "week_end_date": week_end,
        "prev_week": prev_week,
        "next_week": next_week,
        "entity_name": entity_name,
        "days": [
            {
                "weekday": day.weekday,
                "date": day.date,
                "date_iso": day.date_iso,
                "lessons": [
                    {
                        "time_start": lesson.time_start,
                        "time_end": lesson.time_end,
                        "subject": lesson.subject,
                        "lesson_type": lesson.lesson_type,
                        "room": lesson.room,
                        "teachers": lesson.teachers,
                        "groups": lesson.groups,
                        "subgroup": lesson.subgroup,
                        "comment": lesson.comment
                    }
                    for lesson in day.lessons
                ]
            }
            for day in days
        ],
        "time_slots": [{"time_start": ts[0], "time_end": ts[1]} for ts in time_slots]
    }
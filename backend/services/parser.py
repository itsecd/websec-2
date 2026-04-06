from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup


def _text(el) -> str:
    if not el:
        return ""
    return el.get_text(" ", strip=True)


def _parse_ddmmyyyy(s: str) -> Optional[datetime]:
    s = (s or "").strip()
    try:
        return datetime.strptime(s, "%d.%m.%Y")
    except Exception:
        return None


def _to_iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.date().isoformat() if dt else None


def _extract_week_from_href(href: str) -> Optional[int]:
    if not href:
        return None
    try:
        query = parse_qs(urlparse(href).query)
        if "selectedWeek" in query:
            return int(query["selectedWeek"][0])
    except Exception:
        return None
    return None


def _parse_time_block(time_block) -> Tuple[str, str]:
    times = [t.get_text(" ", strip=True) for t in time_block.select(".schedule__time-item")]
    times = [t for t in times if re.search(r"\b\d{1,2}:\d{2}\b", t)]
    if len(times) >= 2:
        return times[0], times[1]

    text = _text(time_block)
    found = re.findall(r"\b\d{1,2}:\d{2}\b", text)
    found = (found + ["", ""])[:2]
    return found[0], found[1]


def _parse_teachers(lesson_div) -> List[dict]:
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
            query = parse_qs(urlparse(href).query)
            if "staffId" in query:
                staff_id = int(query["staffId"][0])
        except Exception:
            staff_id = None
        if name:
            teachers.append({"staff_id": staff_id, "name": name})

    if not teachers:
        name = _text(teacher_block)
        if name:
            teachers.append({"staff_id": None, "name": name})

    uniq = {}
    for teacher in teachers:
        key = (teacher.get("staff_id"), teacher.get("name"))
        uniq[key] = teacher
    return list(uniq.values())


def _parse_groups(lesson_div) -> List[dict]:
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
            query = parse_qs(urlparse(href).query)
            if "groupId" in query:
                group_id = int(query["groupId"][0])
        except Exception:
            group_id = None
        if name:
            groups.append({"group_id": group_id, "name": name})

    if not groups:
        text = _text(groups_block)
        if text:
            for part in re.split(r"\s{2,}|\n|,|;", text):
                part = part.strip()
                if part:
                    groups.append({"group_id": None, "name": part})

    uniq = {}
    for group in groups:
        key = (group.get("group_id"), group.get("name"))
        uniq[key] = group
    return list(uniq.values())


def _parse_subgroup(lesson_div) -> Optional[str]:
    for span in lesson_div.select("span.caption-text"):
        text = _text(span)
        if not text:
            continue
        if re.search(r"Подгрупп", text, flags=re.IGNORECASE):
            match = re.search(r":\s*(.+)$", text)
            if match:
                return match.group(1).strip()
            parts = text.split()
            return parts[-1].strip() if parts else None
    return None


def _parse_cell_lessons(cell, time_start: str, time_end: str) -> List[dict]:
    lesson_divs = cell.find_all("div", class_="schedule__lesson", recursive=False)
    if not lesson_divs:
        return []

    lessons: List[dict] = []
    for lesson_div in lesson_divs:
        lesson_type = _text(lesson_div.select_one(".schedule__lesson-type-chip")) or _text(
            lesson_div.select_one(".schedule__lesson-type")
        )
        subject = _text(lesson_div.select_one(".schedule__discipline")) or _text(
            lesson_div.select_one(".schedule__discipline-name")
        )
        room = _text(lesson_div.select_one(".schedule__place")) or None

        teachers = _parse_teachers(lesson_div)
        groups = _parse_groups(lesson_div)
        subgroup = _parse_subgroup(lesson_div)
        comment = _text(lesson_div.select_one(".schedule__comment")) or None

        if comment and re.search(r"Подгрупп", comment, flags=re.IGNORECASE):
            comment = None

        if not subject:
            body_text = lesson_div.select_one(".body-text")
            subject = _text(body_text)

        if not lesson_type:
            lesson_type = "—"

        teacher_text = ", ".join(t["name"] for t in teachers) if teachers else "—"

        lessons.append(
            {
                "time_start": time_start,
                "time_end": time_end,
                "subject": subject or "—",
                "lesson_type": lesson_type,
                "room": room,
                "teachers": teachers,
                "teacher": teacher_text,
                "groups": groups,
                "subgroup": subgroup,
                "comment": comment,
            }
        )

    return lessons


class ScheduleParser:
    def parse(self, html: str) -> dict:
        soup = BeautifulSoup(html, "lxml")

        container = soup.select_one("div.container.timetable") or soup.find(
            "div", class_=re.compile(r"\btimetable\b")
        )
        if not container:
            raise ValueError("SSAU: не найден контейнер timetable")

        entity_name = ""
        h2 = container.find("h2")
        if h2:
            entity_name = _text(h2)
        if not entity_name:
            h1 = container.find("h1")
            if h1:
                title = _text(h1)
                entity_name = title.split(",", 1)[-1].strip() if "," in title else title.strip()
        if not entity_name:
            entity_name = "—"

        week_label = _text(container.select_one(".week-nav-current_week"))
        week_number = None
        if week_label:
            match = re.search(r"(\d+)", week_label)
            if match:
                week_number = int(match.group(1))

        prev_link = container.select_one(".week-nav-prev")
        next_link = container.select_one(".week-nav-next")
        prev_week = _extract_week_from_href(prev_link.get("href") if prev_link else "")
        next_week = _extract_week_from_href(next_link.get("href") if next_link else "")

        schedule_items = container.select_one(".schedule .schedule__items") or container.select_one(".schedule__items")
        if not schedule_items:
            raise ValueError("SSAU: не найден блок расписания")

        children = schedule_items.find_all(recursive=False)
        if not children:
            raise ValueError("SSAU: пустой блок расписания")

        first_time_idx = None
        for idx, child in enumerate(children):
            if "schedule__time" in (child.get("class") or []):
                first_time_idx = idx
                break

        header_cells = []
        i = 0
        while i < len(children):
            classes = children[i].get("class") or []
            if "schedule__head" in classes:
                header_cells.append(children[i])
                i += 1
            else:
                break

        if len(header_cells) < 2:
            if first_time_idx is None or first_time_idx < 2:
                raise ValueError("SSAU: не удалось извлечь заголовки дней недели")
            header_cells = children[:first_time_idx]
            i = first_time_idx

        if first_time_idx is not None:
            i = first_time_idx

        day_headers = header_cells[1:]
        days: List[dict] = []

        for day_header in day_headers:
            header_text = _text(day_header)
            date_match = re.search(r"(\d{2}\.\d{2}\.\d{4})", header_text)
            date_str = date_match.group(1) if date_match else None
            dt = _parse_ddmmyyyy(date_str or "") if date_str else None

            weekday = header_text.replace(date_str, "").strip() if date_str else header_text.strip()
            weekday = re.sub(r"\s+", " ", weekday)

            days.append(
                {
                    "weekday": weekday or "—",
                    "date": date_str,
                    "date_iso": _to_iso(dt),
                    "lessons": [],
                }
            )

        time_slots: List[dict] = []

        while i < len(children):
            time_block = children[i]
            i += 1

            if "schedule__time" not in (time_block.get("class") or []):
                continue

            time_start, time_end = _parse_time_block(time_block)
            if time_start and time_end:
                if not time_slots or time_slots[-1] != {"time_start": time_start, "time_end": time_end}:
                    time_slots.append({"time_start": time_start, "time_end": time_end})

            for day_idx in range(len(days)):
                if i >= len(children):
                    break
                cell = children[i]
                i += 1

                lessons = _parse_cell_lessons(cell, time_start=time_start, time_end=time_end)
                if lessons:
                    days[day_idx]["lessons"].extend(lessons)

        parsed_dates = [_parse_ddmmyyyy(d["date"] or "") for d in days if d["date"]]
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

        return {
            "week_number": week_number,
            "week_label": week_label or (f"{week_number} неделя" if week_number is not None else None),
            "week_dates": week_dates,
            "week_start_date": week_start,
            "week_end_date": week_end,
            "prev_week": prev_week,
            "next_week": next_week,
            "entity_name": entity_name,
            "time_slots": time_slots,
            "days": days,
        }
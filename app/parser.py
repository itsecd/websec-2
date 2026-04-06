from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup


@dataclass
class ParsedLesson:
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
    weekday: str
    date: Optional[str]
    date_iso: Optional[str]
    lessons: List[ParsedLesson]


@dataclass
class ParsedSchedule:
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


class ScheduleParser:
    
    @staticmethod
    def parse_schedule(html: str) -> ParsedSchedule:
        soup = BeautifulSoup(html, "lxml")
        
        print("=== НАЧАЛО ПАРСИНГА ===")
        
        entity_name = "—"
        h1 = soup.find("h1", class_="h1-text")
        if h1:
            entity_name = h1.get_text(strip=True).replace("Расписание,", "").strip()
        print(f"Название: {entity_name}")
        
        week_number = None
        week_label = None
        week_nav = soup.select_one(".week-nav-current_week")
        if week_nav:
            week_label = week_nav.get_text(strip=True)
            print(f"Week nav text: {week_label}")
            match = re.search(r"(\d+)", week_label)
            if match:
                week_number = int(match.group(1))
        
        prev_week = None
        next_week = None
        prev_link = soup.select_one(".week-nav-prev")
        if prev_link:
            href = prev_link.get("href", "")
            match = re.search(r"selectedWeek=(\d+)", href)
            if match:
                prev_week = int(match.group(1))
        
        next_link = soup.select_one(".week-nav-next")
        if next_link:
            href = next_link.get("href", "")
            match = re.search(r"selectedWeek=(\d+)", href)
            if match:
                next_week = int(match.group(1))
        
        print(f"Week: {week_number}, prev: {prev_week}, next: {next_week}")
        
        headers = soup.select(".schedule__head")
        print(f"Найдено заголовков: {len(headers)}")
        
        days = []
        for idx, header in enumerate(headers):
            print(f"  Заголовок {idx}: {header.get_text(strip=True)[:50]}")
            if idx == 0:
                continue
            
            weekday_elem = header.select_one(".schedule__head-weekday")
            date_elem = header.select_one(".schedule__head-date")
            
            weekday = weekday_elem.get_text(strip=True) if weekday_elem else f"День {idx}"
            date_str = date_elem.get_text(strip=True) if date_elem else None
            
            date_iso = None
            if date_str:
                try:
                    dt = datetime.strptime(date_str, "%d.%m.%Y")
                    date_iso = dt.date().isoformat()
                except:
                    pass
            
            days.append(ParsedDay(
                weekday=weekday,
                date=date_str,
                date_iso=date_iso,
                lessons=[]
            ))
        
        print(f"Дней: {len(days)}")
        
        time_blocks = soup.select(".schedule__time")
        print(f"Найдено временных блоков: {len(time_blocks)}")
        
        time_slots = []
        
        for ti, time_block in enumerate(time_blocks):
            time_items = time_block.select(".schedule__time-item")
            print(f"  Временной блок {ti}: {len(time_items)} элементов")
            
            if len(time_items) >= 2:
                time_start = time_items[0].get_text(strip=True)
                time_end = time_items[1].get_text(strip=True)
                time_slots.append((time_start, time_end))
                print(f"    Время: {time_start} - {time_end}")
                
                current = time_block.find_next_sibling()
                day_idx = 0
                while current and day_idx < len(days):
                    if "schedule__item" in current.get("class", []):
                        lessons = ScheduleParser._parse_lesson_cell(current, time_start, time_end)
                        if lessons:
                            print(f"      День {day_idx}: {len(lessons)} занятий")
                        days[day_idx].lessons.extend(lessons)
                        day_idx += 1
                    current = current.find_next_sibling()
        
        print(f"Итого временных слотов: {len(time_slots)}")
        
        week_start_date = None
        week_end_date = None
        week_dates = None
        
        if days and days[0].date and days[-1].date:
            week_dates = f"{days[0].date} - {days[-1].date}"
        
        return ParsedSchedule(
            week_number=week_number,
            week_label=week_label,
            week_dates=week_dates,
            week_start_date=week_start_date,
            week_end_date=week_end_date,
            prev_week=prev_week,
            next_week=next_week,
            entity_name=entity_name,
            days=days,
            time_slots=time_slots,
        )
    
    @staticmethod
    def _parse_lesson_cell(cell, time_start: str, time_end: str) -> List[ParsedLesson]:
        """Парсит ячейку с занятиями"""
        lessons = []
        
        lesson_divs = cell.select(".schedule__lesson")
        
        for lesson_div in lesson_divs:
            type_chip = lesson_div.select_one(".schedule__lesson-type-chip")
            lesson_type = type_chip.get_text(strip=True) if type_chip else "—"
            
            discipline = lesson_div.select_one(".schedule__discipline")
            subject = discipline.get_text(strip=True) if discipline else "—"
            
            place = lesson_div.select_one(".schedule__place")
            room = place.get_text(strip=True) if place else None
            
            teachers = []
            teacher_links = lesson_div.select(".schedule__teacher a")
            for link in teacher_links:
                href = link.get("href", "")
                match = re.search(r"staffId=(\d+)", href)
                teachers.append({
                    "staff_id": int(match.group(1)) if match else None,
                    "name": link.get_text(strip=True)
                })
            
            if not teachers:
                teacher_text = lesson_div.select_one(".schedule__teacher")
                if teacher_text:
                    text = teacher_text.get_text(strip=True)
                    if text and text not in ["—", ""]:
                        teachers.append({"staff_id": None, "name": text})
            
            groups = []
            group_links = lesson_div.select(".schedule__groups a")
            for link in group_links:
                href = link.get("href", "")
                match = re.search(r"groupId=(\d+)", href)
                groups.append({
                    "group_id": int(match.group(1)) if match else None,
                    "name": link.get_text(strip=True)
                })
            
            subgroup = None
            groups_text = lesson_div.select_one(".schedule__groups")
            if groups_text:
                text = groups_text.get_text(strip=True)
                if "Подгруппы:" in text or "Подгруппа:" in text:
                    match = re.search(r"Подгрупп[аы]*:\s*(.+)", text)
                    if match:
                        subgroup = match.group(1).strip()
            
            lessons.append(ParsedLesson(
                time_start=time_start,
                time_end=time_end,
                subject=subject,
                lesson_type=lesson_type,
                room=room,
                teachers=teachers,
                groups=groups,
                subgroup=subgroup,
                comment=None
            ))
        
        return lessons
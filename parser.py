import aiohttp
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Any


BASE_URL = "https://ssau.ru/rasp"


def get_headers() -> Dict[str, str]:
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
    }


async def get_groups() -> List[Dict[str, str]]:
    return [
        {"id": "1213641978", "name": "6413-100503D"},
        {"id": "1282690301", "name": "6411-100503D"},
        {"id": "1282690279", "name": "6412-100503D"},
    ]


async def get_teachers() -> List[Dict[str, str]]:
    return [
        {"id": "432837452", "name": "Юзькив Р.Р."},
        {"id": "114869468", "name": "Сергеев А.В."},
        {"id": "62061001", "name": "Мясников В.В."},
        {"id": "594502705", "name": "Чернышев П.В."},
        {"id": "335824546", "name": "Максимов А.И."},
        {"id": "664017039", "name": "Борисов А.Н."},
        {"id": "364272302", "name": "Агафонов А.А."},
        {"id": "147619112", "name": "Кузнецов А.В."},
        {"id": "333991624", "name": "Веричев А.В."},
        {"id": "544973937", "name": "Шапиро Д.А."},
    ]


def build_url(schedule_type: str, entity_id: str, week: Optional[int] = None) -> str:
    param = "groupId" if schedule_type == "group" else "staffId"
    params = {param: entity_id}
    if week:
        params["selectedWeek"] = str(week)
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{BASE_URL}?{query}"


def get_week_number(soup: BeautifulSoup) -> int:
    week_span = soup.select_one("span.week-nav-current_week")
    if not week_span:
        return 30
    
    try:
        return int(week_span.get_text(strip=True).split()[0])
    except ValueError:
        return 30


def get_entity_name(soup: BeautifulSoup, default_id: str) -> str:
    title = soup.select_one(".info-block__title") or soup.select_one("h1.h1-text")
    if not title:
        return default_id
    
    text = title.get_text(strip=True)
    return text.replace("Расписание, ", "").strip()


def get_days(soup: BeautifulSoup) -> List[Dict[str, str]]:
    days = []
    for head in soup.select(".schedule__head")[1:]:
        weekday = head.select_one(".schedule__head-weekday")
        date = head.select_one(".schedule__head-date")
        if weekday and date:
            days.append({
                "weekday": weekday.get_text(strip=True).capitalize(),
                "date": date.get_text(strip=True),
            })
    return days


def parse_groups(groups_block) -> Dict[str, Any]:
    if not groups_block:
        return {"subgroup": "", "group_info": "", "group_was_parsed": False}
    
    subgroup = ""
    caption = groups_block.select_one("span.caption-text")
    if caption and "подгруппы" in caption.get_text().lower():
        subgroup = caption.get_text(strip=True)
    
    group_links = groups_block.select("a.schedule__group")
    group_info = ", ".join(link.get_text(strip=True) for link in group_links)
    
    return {
        "subgroup": subgroup,
        "group_info": group_info,
        "group_was_parsed": bool(group_links),
    }


def parse_lesson(lesson_elem) -> Dict[str, Any]:
    type_chip = lesson_elem.select_one(".schedule__lesson-type-chip")
    lesson_type = type_chip.get_text(strip=True) if type_chip else ""
    
    subject = lesson_elem.select_one(".schedule__discipline")
    subject = subject.get_text(strip=True) if subject else ""
    
    room_elem = lesson_elem.select_one(".schedule__place")
    room = room_elem.get_text(strip=True) if room_elem else "online"
    
    teacher_elem = lesson_elem.select_one(".schedule__teacher")
    teacher = teacher_elem.get_text(strip=True) if teacher_elem else ""
    
    groups_block = lesson_elem.select_one(".schedule__groups")
    groups_data = {}
    
    if groups_block:
        groups_data = parse_groups(groups_block)
    else:
        group_links = lesson_elem.select("a.schedule__group")
        if group_links:
            group_info = ", ".join(link.get_text(strip=True) for link in group_links)
            groups_data = {
                "subgroup": "",
                "group_info": group_info,
                "group_was_parsed": True,
            }
        else:
            groups_data = {
                "subgroup": "",
                "group_info": "",
                "group_was_parsed": False,
            }
    
    return {
        "subject": subject,
        "type": lesson_type,
        "teacher": teacher,
        "room": room,
        "subgroup": groups_data["subgroup"],
        "groups": groups_data["group_info"],
    }


def build_grid(soup: BeautifulSoup, num_days: int) -> List[List[Optional[List[Dict[str, Any]]]]]:
    all_cells = []
    
    for item in soup.select(".schedule__item"):
        if "schedule__head" in (item.get("class") or []):
            continue
        lessons = item.select(".schedule__lesson")
        cell_data = [parse_lesson(lesson) for lesson in lessons] if lessons else None
        all_cells.append(cell_data)
    return [all_cells[i:i + num_days] for i in range(0, len(all_cells), num_days)]


def get_time_slots(soup: BeautifulSoup) -> List[str]:
    time_slots = []
    for time_block in soup.select(".schedule__time"):
        times = time_block.select(".schedule__time-item")
        if len(times) >= 2:
            start = times[0].get_text(strip=True)
            end = times[1].get_text(strip=True)
            time_slots.append(f"{start}–{end}")
    return time_slots


async def get_schedule(schedule_type: str, entity_id: str, week: Optional[int] = None) -> Dict[str, Any]:
    url = build_url(schedule_type, entity_id, week)
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=get_headers()) as response:
            response.raise_for_status()
            html = await response.text()
    
    soup = BeautifulSoup(html, "html.parser")
    
    current_week = get_week_number(soup)
    entity_name = get_entity_name(soup, entity_id)
    days = get_days(soup)
    num_days = len(days) or 6
    
    grid = build_grid(soup, num_days)
    time_slots = get_time_slots(soup)
    
    while len(time_slots) < len(grid):
        time_slots.append("—")
    
    return {
        "week": current_week,
        "entity_name": entity_name,
        "days": days,
        "time_slots": time_slots[:len(grid)],
        "grid": grid,
    }
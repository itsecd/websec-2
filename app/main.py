from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .cache import AsyncTTLCache
from .client import SsauClient
from .parser import ScheduleParser
from .models import ApiResponse, WeekSchedule

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(PROJECT_ROOT, "static")
CACHE_DIR = os.path.join(PROJECT_ROOT, "cache")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

ssau_client = SsauClient()

institutes_cache = AsyncTTLCache(3600 * 24, 10, os.path.join(CACHE_DIR, "institutes"))
courses_cache = AsyncTTLCache(3600 * 24, 100, os.path.join(CACHE_DIR, "courses"))
groups_cache = AsyncTTLCache(3600 * 12, 500, os.path.join(CACHE_DIR, "groups"))
teachers_cache = AsyncTTLCache(3600, 1000, os.path.join(CACHE_DIR, "teachers"))
schedule_cache = AsyncTTLCache(300, 500, os.path.join(CACHE_DIR, "schedule"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    yield
    await ssau_client.close()


app = FastAPI(
    title="SSAU Schedule API",
    description="Прокси-сервер для расписания СГАУ",
    version="2.0.0",
    lifespan=lifespan,
)

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index():
    """Главная страница"""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse(
        status_code=404,
        content={"error": "index.html not found"}
    )


# API endpoints

@app.get("/api/institutes")
async def get_institutes():
    """Список институтов/факультетов"""
    async def fetch():
        items = await ssau_client.get_institutes()
        return {"institutes": [{"id": i, "name": n, "url": u} for i, n, u in items]}
    
    data = await institutes_cache.get_or_set("institutes", fetch)
    return ApiResponse(success=True, data=data)


@app.get("/api/courses")
async def get_courses(institute_id: int = Query(...)):
    """Список курсов для института"""
    async def fetch():
        courses = await ssau_client.get_courses(institute_id)
        return {"institute_id": institute_id, "courses": courses}
    
    data = await courses_cache.get_or_set(f"courses:{institute_id}", fetch)
    return ApiResponse(success=True, data=data)


@app.get("/api/groups")
async def get_groups(
    institute_id: int = Query(...),
    course: int = Query(..., ge=1, le=12),
):
    """Список групп для института и курса"""
    async def fetch():
        groups = await ssau_client.get_groups(institute_id, course)
        return {
            "institute_id": institute_id,
            "course": course,
            "groups": [{"id": g, "name": n} for g, n in groups],
        }
    
    data = await groups_cache.get_or_set(f"groups:{institute_id}:{course}", fetch)
    return ApiResponse(success=True, data=data)


@app.get("/api/teachers")
async def search_teachers(q: str = Query(..., min_length=2)):
    """Поиск преподавателей"""
    async def fetch():
        teachers = await ssau_client.search_teachers(q)
        return {
            "query": q,
            "teachers": [{"id": t, "name": n} for t, n in teachers],
        }
    
    data = await teachers_cache.get_or_set(f"teachers:{q.lower()}", fetch)
    return ApiResponse(success=True, data=data)


@app.get("/api/schedule")
async def get_schedule(
    group_id: Optional[int] = Query(None),
    staff_id: Optional[int] = Query(None),
    week: Optional[int] = Query(None),
):
    """Расписание для группы или преподавателя"""
    
    if group_id is None and staff_id is None:
        return JSONResponse(
            status_code=400,
            content=ApiResponse(success=False, error="Укажите group_id или staff_id").model_dump(),
        )
    
    entity_type = "group" if group_id else "teacher"
    entity_id = group_id or staff_id
    week_key = week if week else "current"
    cache_key = f"{entity_type}:{entity_id}:{week_key}"
    
    async def fetch():
        if group_id:
            url = f"https://ssau.ru/rasp?groupId={group_id}"
            if week:
                url += f"&selectedWeek={week}&selectedWeekday=1"
        else:
            url = f"https://ssau.ru/rasp?staffId={staff_id}"
            if week:
                url += f"&selectedWeek={week}&selectedWeekday=1"
        
        print(f"Fetching: {url}")
        
        html = await ssau_client.fetch_html(url)
        
        parsed = ScheduleParser.parse_schedule(html)
        
        days_list = []
        for day in parsed.days:
            lessons_list = []
            for lesson in day.lessons:
                lessons_list.append({
                    "time_start": lesson.time_start,
                    "time_end": lesson.time_end,
                    "subject": lesson.subject,
                    "lesson_type": lesson.lesson_type,
                    "room": lesson.room,
                    "teachers": lesson.teachers,
                    "groups": lesson.groups,
                    "subgroup": lesson.subgroup,
                    "comment": lesson.comment,
                })
            days_list.append({
                "weekday": day.weekday,
                "date": day.date,
                "date_iso": day.date_iso,
                "lessons": lessons_list,
            })
        
        time_slots_list = [(start, end) for start, end in parsed.time_slots]
        
        result = {
            "week_number": parsed.week_number,
            "week_label": parsed.week_label,
            "week_dates": parsed.week_dates,
            "week_start_date": parsed.week_start_date,
            "week_end_date": parsed.week_end_date,
            "prev_week": parsed.prev_week,
            "next_week": parsed.next_week,
            "entity_name": parsed.entity_name,
            "entity_type": entity_type,
            "days": days_list,
            "time_slots": time_slots_list,
        }
        
        print(f"Parsed days: {len(days_list)}, time slots: {len(time_slots_list)}")
        return result
    
    try:
        data = await schedule_cache.get_or_set(cache_key, fetch)
        return ApiResponse(success=True, data=data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=502,
            content=ApiResponse(success=False, error=f"Ошибка загрузки: {str(e)}").model_dump(),
        )
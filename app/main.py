from __future__ import annotations

import os
from datetime import datetime
from typing import Optional

import httpx
from fastapi import FastAPI, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .cache import AsyncTTLCache
from .models import (
    ErrorResponse,
    GroupsResponse,
    InstitutesResponse,
    ScheduleOut,
    TeachersResponse,
    WeekCurrentResponse,
)
from .ssau_client import SsauClient
from .ssau_parser import parse_schedule

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(APP_ROOT)
STATIC_DIR = os.path.join(PROJECT_ROOT, "static")

app = FastAPI(title="SSAU Schedule (FastAPI proxy)", version="1.0.0")

ssau = SsauClient(timeout_seconds=25.0)

# Caches (in-memory)
institutes_cache = AsyncTTLCache(ttl_seconds=12 * 60 * 60, max_items=5)
faculty_courses_cache = AsyncTTLCache(ttl_seconds=12 * 60 * 60, max_items=256)
faculty_groups_cache = AsyncTTLCache(ttl_seconds=6 * 60 * 60, max_items=1024)
teachers_search_cache = AsyncTTLCache(ttl_seconds=10 * 60, max_items=2048)
schedule_cache = AsyncTTLCache(ttl_seconds=5 * 60, max_items=2048)


@app.on_event("shutdown")
async def _shutdown():
    await ssau.aclose()


# Static frontend
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


async def _get_institutes_cached() -> InstitutesResponse:
    async def _fetch():
        items = await ssau.get_institutes()
        institutes = [{"id": i, "name": n, "url": u} for (i, n, u) in items]
        return InstitutesResponse(institutes=institutes, source_url="https://ssau.ru/rasp")

    return await institutes_cache.get_or_set("institutes", _fetch)


async def _get_courses_cached(institute_id: int) -> list[int]:
    async def _fetch():
        return await ssau.get_faculty_available_courses(institute_id)

    return await faculty_courses_cache.get_or_set(f"courses:{institute_id}", _fetch)


async def _get_groups_cached(institute_id: int, course: int) -> list[dict]:
    async def _fetch():
        items = await ssau.get_groups_for_faculty(institute_id, course)
        return [{"id": gid, "name": name, "url": url} for (gid, name, url) in items]

    return await faculty_groups_cache.get_or_set(f"groups:{institute_id}:{course}", _fetch)


@app.get("/api/institutes", response_model=InstitutesResponse)
async def api_institutes():
    return await _get_institutes_cached()


@app.get("/api/groups", response_model=GroupsResponse)
async def api_groups(
    institute_id: int = Query(..., description="facultyId из /rasp/faculty/<id>"),
    course: Optional[int] = Query(None, ge=0, le=12, description="номер курса (как в SSAU: ?course=N)"),
):
    available_courses = await _get_courses_cached(institute_id)

    if course is None:
        return GroupsResponse(
            institute_id=institute_id,
            course=None,
            available_courses=available_courses,
            groups=[],
            source_url=f"https://ssau.ru/rasp/faculty/{institute_id}?course=1",
        )

    groups = await _get_groups_cached(institute_id, course)

    return GroupsResponse(
        institute_id=institute_id,
        course=course,
        available_courses=available_courses,
        groups=groups,
        source_url=f"https://ssau.ru/rasp/faculty/{institute_id}?course={course}",
    )


@app.get("/api/teachers", response_model=TeachersResponse)
async def api_teachers(
    q: str = Query(..., min_length=2, max_length=64, description="строка поиска (>=2 символа)"),
):
    q_norm = q.strip()

    async def _fetch():
        items = await ssau.search_groups_and_teachers(q_norm)
        teachers = [
            {"id": it.id, "name": it.name, "url": it.url}
            for it in items
            if it.type == "teacher"
        ]
        return TeachersResponse(q=q_norm, teachers=teachers, source_url="https://ssau.ru/rasp/search")

    return await teachers_search_cache.get_or_set(f"teachers:{q_norm.lower()}", _fetch)


@app.get("/api/schedule/group", response_model=ScheduleOut)
async def api_schedule_group(
    group_id: int = Query(..., description="groupId"),
    week: Optional[int] = Query(None, description="номер недели (selectedWeek)"),
):
    week_key = "current" if week is None else str(week)
    cache_key = f"group:{group_id}:{week_key}"

    async def _fetch():
        if week is None:
            url = f"https://ssau.ru/rasp?groupId={group_id}"
        else:
            url = f"https://ssau.ru/rasp?groupId={group_id}&selectedWeek={week}&selectedWeekday=1"
        html = await ssau.fetch_html(url)
        parsed = parse_schedule(html)
        return ScheduleOut(
            week_number=parsed.week_number,
            week_label=parsed.week_label,
            week_dates=parsed.week_dates,
            week_start_date=parsed.week_start_date,
            week_end_date=parsed.week_end_date,
            prev_week=parsed.prev_week,
            next_week=parsed.next_week,
            mode="group",
            entity_name=parsed.entity_name,
            time_slots=[{"time_start": a, "time_end": b} for (a, b) in parsed.time_slots],
            days=[
                {
                    "weekday": d.weekday,
                    "date": d.date,
                    "date_iso": d.date_iso,
                    "lessons": [
                        {
                            "time_start": l.time_start,
                            "time_end": l.time_end,
                            "subject": l.subject,
                            "lesson_type": l.lesson_type,
                            "room": l.room,
                            "teachers": l.teachers,
                            "groups": l.groups,
                            "subgroup": l.subgroup,
                            "comment": l.comment,
                        }
                        for l in d.lessons
                    ],
                }
                for d in parsed.days
            ],
            source_url=url,
            fetched_at=datetime.utcnow().isoformat() + "Z",
        )

    return await _schedule_try(cache_key, _fetch)


@app.get("/api/schedule/teacher", response_model=ScheduleOut)
async def api_schedule_teacher(
    staff_id: int = Query(..., description="staffId"),
    week: Optional[int] = Query(None, description="номер недели (selectedWeek)"),
):
    week_key = "current" if week is None else str(week)
    cache_key = f"teacher:{staff_id}:{week_key}"

    async def _fetch():
        if week is None:
            url = f"https://ssau.ru/rasp?staffId={staff_id}"
        else:
            url = f"https://ssau.ru/rasp?staffId={staff_id}&selectedWeek={week}&selectedWeekday=1"
        html = await ssau.fetch_html(url)
        parsed = parse_schedule(html)
        return ScheduleOut(
            week_number=parsed.week_number,
            week_label=parsed.week_label,
            week_dates=parsed.week_dates,
            week_start_date=parsed.week_start_date,
            week_end_date=parsed.week_end_date,
            prev_week=parsed.prev_week,
            next_week=parsed.next_week,
            mode="teacher",
            entity_name=parsed.entity_name,
            time_slots=[{"time_start": a, "time_end": b} for (a, b) in parsed.time_slots],
            days=[
                {
                    "weekday": d.weekday,
                    "date": d.date,
                    "date_iso": d.date_iso,
                    "lessons": [
                        {
                            "time_start": l.time_start,
                            "time_end": l.time_end,
                            "subject": l.subject,
                            "lesson_type": l.lesson_type,
                            "room": l.room,
                            "teachers": l.teachers,
                            "groups": l.groups,
                            "subgroup": l.subgroup,
                            "comment": l.comment,
                        }
                        for l in d.lessons
                    ],
                }
                for d in parsed.days
            ],
            source_url=url,
            fetched_at=datetime.utcnow().isoformat() + "Z",
        )

    return await _schedule_try(cache_key, _fetch)


async def _schedule_try(cache_key: str, factory):
    try:
        return await schedule_cache.get_or_set(cache_key, factory)
    except httpx.HTTPStatusError as e:
        return JSONResponse(
            status_code=502,
            content=ErrorResponse(
                error="SSAU_HTTP_ERROR",
                detail=f"SSAU вернул ошибку: {e.response.status_code}",
            ).model_dump(),
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(error="PARSE_ERROR", detail=str(e)).model_dump(),
        )


@app.get("/api/weeks/current", response_model=WeekCurrentResponse)
async def api_weeks_current(
    group_id: Optional[int] = Query(None, description="Если указан — определяем текущую неделю по этой группе"),
    staff_id: Optional[int] = Query(None, description="Если указан — определяем текущую неделю по этому преподавателю"),
):
    if group_id is not None and staff_id is not None:
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(error="BAD_REQUEST", detail="Укажите либо group_id, либо staff_id").model_dump(),
        )

    cache_key = (
        f"week_current:group:{group_id}" if group_id is not None else
        f"week_current:teacher:{staff_id}" if staff_id is not None else
        "week_current:default"
    )

    async def _fetch():
        if group_id is not None:
            url = f"https://ssau.ru/rasp?groupId={group_id}"
        elif staff_id is not None:
            url = f"https://ssau.ru/rasp?staffId={staff_id}"
        else:
            inst_resp = await _get_institutes_cached()
            if not inst_resp.institutes:
                url = "https://ssau.ru/rasp"
            else:
                first_inst = inst_resp.institutes[0]
                courses = await _get_courses_cached(first_inst.id)
                course = courses[0] if courses else 1
                groups = await _get_groups_cached(first_inst.id, course)
                if groups:
                    gid = groups[0]["id"]
                    url = f"https://ssau.ru/rasp?groupId={gid}"
                else:
                    url = f"https://ssau.ru/rasp/faculty/{first_inst.id}?course={course}"

        html = await ssau.fetch_html(url)
        parsed = parse_schedule(html)
        return WeekCurrentResponse(
            week_number=parsed.week_number,
            week_label=parsed.week_label,
            week_dates=parsed.week_dates,
            week_start_date=parsed.week_start_date,
            week_end_date=parsed.week_end_date,
            source_url=url,
            fetched_at=datetime.utcnow().isoformat() + "Z",
        )

    try:
        return await schedule_cache.get_or_set(cache_key, _fetch)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(error="WEEK_PARSE_ERROR", detail=str(e)).model_dump(),
        )

from __future__ import annotations

import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from backend.core.cache import AsyncTTLCache
from backend.services.parser import ScheduleParser
from backend.services.ssau_api import SsauAPI

logger = logging.getLogger(__name__)

router = APIRouter()

api = SsauAPI(timeout_seconds=25.0)
parser = ScheduleParser()

institutes_cache = AsyncTTLCache(ttl_seconds=12 * 60 * 60, max_items=8)
courses_cache = AsyncTTLCache(ttl_seconds=12 * 60 * 60, max_items=256)
groups_cache = AsyncTTLCache(ttl_seconds=6 * 60 * 60, max_items=1024)
teachers_cache = AsyncTTLCache(ttl_seconds=10 * 60, max_items=2048)
schedule_cache = AsyncTTLCache(ttl_seconds=5 * 60, max_items=2048)


@router.get("/institutes")
async def get_institutes():
    async def _fetch():
        logger.info("Загрузка списка институтов с SSAU")
        items = await api.get_institutes()
        logger.info("Получено институтов: %s", len(items))
        return {
            "institutes": [{"id": i, "name": n, "url": u} for (i, n, u) in items]
        }

    try:
        return await institutes_cache.get_or_set("institutes", _fetch)
    except Exception as e:
        logger.exception("Ошибка при получении списка институтов")
        return JSONResponse(
            status_code=500,
            content={
                "error": "INSTITUTES_ERROR",
                "detail": f"Не удалось загрузить список институтов: {str(e)}",
            },
        )


@router.get("/groups")
async def get_groups(
    institute_id: int = Query(...),
    course: Optional[int] = Query(None),
):
    async def _fetch_courses():
        logger.info("Загрузка курсов для institute_id=%s", institute_id)
        return await api.get_faculty_available_courses(institute_id)

    try:
        available_courses = await courses_cache.get_or_set(
            f"courses:{institute_id}",
            _fetch_courses,
        )

        if course is None:
            return {
                "institute_id": institute_id,
                "course": None,
                "available_courses": available_courses,
                "groups": [],
            }

        async def _fetch_groups():
            logger.info(
                "Загрузка групп для institute_id=%s, course=%s",
                institute_id,
                course,
            )
            items = await api.get_groups_for_faculty(institute_id, course)
            logger.info(
                "Получено групп для institute_id=%s, course=%s: %s",
                institute_id,
                course,
                len(items),
            )
            return [{"id": gid, "name": name, "url": url} for (gid, name, url) in items]

        groups = await groups_cache.get_or_set(
            f"groups:{institute_id}:{course}",
            _fetch_groups,
        )

        return {
            "institute_id": institute_id,
            "course": course,
            "available_courses": available_courses,
            "groups": groups,
        }

    except httpx.HTTPStatusError as e:
        logger.exception(
            "SSAU вернул HTTP %s при загрузке групп/курсов: institute_id=%s, course=%s",
            e.response.status_code,
            institute_id,
            course,
        )
        return JSONResponse(
            status_code=502,
            content={
                "error": "GROUPS_ERROR",
                "detail": f"SSAU вернул HTTP {e.response.status_code} при загрузке групп или курсов",
            },
        )
    except Exception as e:
        logger.exception(
            "Ошибка при получении групп/курсов: institute_id=%s, course=%s",
            institute_id,
            course,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "GROUPS_ERROR",
                "detail": f"Не удалось загрузить группы или курсы: {str(e)}",
            },
        )


@router.get("/teachers")
async def search_teachers(
    q: str = Query(..., min_length=2, max_length=64),
):
    q_norm = q.strip()

    async def _fetch():
        logger.info("Поиск преподавателей по запросу: %r", q_norm)
        items = await api.search_groups_and_teachers(q_norm)
        teachers = [
            {"id": item.id, "name": item.name, "url": item.url}
            for item in items
            if item.type == "teacher"
        ]
        logger.info("Найдено преподавателей по запросу %r: %s", q_norm, len(teachers))
        return {"q": q_norm, "teachers": teachers}

    try:
        return await teachers_cache.get_or_set(
            f"teachers:{q_norm.lower()}",
            _fetch,
        )
    except httpx.HTTPStatusError as e:
        logger.exception(
            "SSAU вернул HTTP %s при поиске преподавателей по запросу %r",
            e.response.status_code,
            q_norm,
        )
        return JSONResponse(
            status_code=502,
            content={
                "error": "TEACHERS_SEARCH_ERROR",
                "detail": f"SSAU вернул HTTP {e.response.status_code} при поиске преподавателей",
            },
        )
    except Exception as e:
        logger.exception("Ошибка при поиске преподавателей по запросу %r", q_norm)
        return JSONResponse(
            status_code=500,
            content={
                "error": "TEACHERS_SEARCH_ERROR",
                "detail": f"Не удалось выполнить поиск преподавателей: {str(e)}",
            },
        )


@router.get("/schedule/group")
async def get_group_schedule(
    group_id: int = Query(...),
    week: Optional[int] = Query(None),
):
    week_key = "current" if week is None else str(week)
    cache_key = f"group:{group_id}:{week_key}"

    async def _fetch():
        logger.info("Загрузка расписания группы: group_id=%s, week=%s", group_id, week_key)
        html = await api.fetch_group_schedule_html(group_id, week)

        if not html or not html.strip():
            raise ValueError("SSAU вернул пустой HTML для расписания группы")

        parsed = parser.parse(html)
        parsed["mode"] = "group"
        parsed["group_id"] = group_id
        parsed["requested_week"] = week
        logger.info(
            "Расписание группы успешно разобрано: group_id=%s, week=%s, days=%s, slots=%s",
            group_id,
            week_key,
            len(parsed.get("days", [])),
            len(parsed.get("time_slots", [])),
        )
        return parsed

    try:
        return await schedule_cache.get_or_set(cache_key, _fetch)

    except httpx.HTTPStatusError as e:
        logger.exception(
            "SSAU вернул HTTP %s при загрузке расписания группы: group_id=%s, week=%s",
            e.response.status_code,
            group_id,
            week_key,
        )
        return JSONResponse(
            status_code=502,
            content={
                "error": "GROUP_SCHEDULE_ERROR",
                "detail": f"SSAU вернул HTTP {e.response.status_code} при загрузке расписания группы",
            },
        )

    except httpx.RequestError as e:
        logger.exception(
            "Сетевая ошибка при загрузке расписания группы: group_id=%s, week=%s",
            group_id,
            week_key,
        )
        return JSONResponse(
            status_code=502,
            content={
                "error": "GROUP_SCHEDULE_NETWORK_ERROR",
                "detail": f"Сетевая ошибка при обращении к SSAU: {str(e)}",
            },
        )

    except ValueError as e:
        logger.exception(
            "Ошибка разбора расписания группы: group_id=%s, week=%s",
            group_id,
            week_key,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "GROUP_SCHEDULE_PARSE_ERROR",
                "detail": f"Не удалось разобрать HTML расписания группы: {str(e)}",
            },
        )

    except Exception as e:
        logger.exception(
            "Неожиданная ошибка при загрузке расписания группы: group_id=%s, week=%s",
            group_id,
            week_key,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "GROUP_SCHEDULE_ERROR",
                "detail": f"Не удалось загрузить расписание группы: {str(e)}",
            },
        )


@router.get("/schedule/teacher")
async def get_teacher_schedule(
    staff_id: int = Query(...),
    week: Optional[int] = Query(None),
):
    week_key = "current" if week is None else str(week)
    cache_key = f"teacher:{staff_id}:{week_key}"

    async def _fetch():
        logger.info("Загрузка расписания преподавателя: staff_id=%s, week=%s", staff_id, week_key)
        html = await api.fetch_teacher_schedule_html(staff_id, week)

        if not html or not html.strip():
            raise ValueError("SSAU вернул пустой HTML для расписания преподавателя")

        parsed = parser.parse(html)
        parsed["mode"] = "teacher"
        parsed["staff_id"] = staff_id
        parsed["requested_week"] = week
        logger.info(
            "Расписание преподавателя успешно разобрано: staff_id=%s, week=%s, days=%s, slots=%s",
            staff_id,
            week_key,
            len(parsed.get("days", [])),
            len(parsed.get("time_slots", [])),
        )
        return parsed

    try:
        return await schedule_cache.get_or_set(cache_key, _fetch)

    except httpx.HTTPStatusError as e:
        logger.exception(
            "SSAU вернул HTTP %s при загрузке расписания преподавателя: staff_id=%s, week=%s",
            e.response.status_code,
            staff_id,
            week_key,
        )
        return JSONResponse(
            status_code=502,
            content={
                "error": "TEACHER_SCHEDULE_ERROR",
                "detail": f"SSAU вернул HTTP {e.response.status_code} при загрузке расписания преподавателя",
            },
        )

    except httpx.RequestError as e:
        logger.exception(
            "Сетевая ошибка при загрузке расписания преподавателя: staff_id=%s, week=%s",
            staff_id,
            week_key,
        )
        return JSONResponse(
            status_code=502,
            content={
                "error": "TEACHER_SCHEDULE_NETWORK_ERROR",
                "detail": f"Сетевая ошибка при обращении к SSAU: {str(e)}",
            },
        )

    except ValueError as e:
        logger.exception(
            "Ошибка разбора расписания преподавателя: staff_id=%s, week=%s",
            staff_id,
            week_key,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "TEACHER_SCHEDULE_PARSE_ERROR",
                "detail": f"Не удалось разобрать HTML расписания преподавателя: {str(e)}",
            },
        )

    except Exception as e:
        logger.exception(
            "Неожиданная ошибка при загрузке расписания преподавателя: staff_id=%s, week=%s",
            staff_id,
            week_key,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "TEACHER_SCHEDULE_ERROR",
                "detail": f"Не удалось загрузить расписание преподавателя: {str(e)}",
            },
        )
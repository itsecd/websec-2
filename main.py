from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import uvicorn
import os

from app.ssau_client import SsauClient
from app.parser import parse_schedule

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = SsauClient()

@app.get("/api/institutes")
async def get_institutes():
    try:
        institutes = client.get_institutes()
        return {"institutes": [{"id": inst_id, "name": name} for inst_id, name in institutes]}
    except Exception as e:
        print(f"Ошибка: {e}")
        return {"institutes": []}

@app.get("/api/groups")
async def get_groups(
    institute_id: int = Query(None),
    course: int = Query(None)
):
    if course is None:
        try:
            courses = client.get_available_courses(institute_id)
            return {"available_courses": courses}
        except Exception as e:
            print(f"Ошибка получения курсов: {e}")
            return {"available_courses": [1, 2, 3, 4, 5]}
    else:
        try:
            groups = client.get_groups_by_course(institute_id, course)
            return {"groups": [{"id": group_id, "name": name} for group_id, name in groups]}
        except Exception as e:
            print(f"Ошибка получения групп: {e}")
            return {"groups": []}

@app.get("/api/teachers")
async def search_teachers(q: str = Query("", min_length=2)):
    if len(q) < 2:
        return {"teachers": []}
    
    try:
        teachers = client.search_teachers(q)
        return {"teachers": teachers}
    except Exception as e:
        print(f"Ошибка поиска: {e}")
        return {"teachers": []}

@app.get("/api/schedule/group")
async def get_schedule_group(
    group_id: int = Query(..., description="ID группы"),
    week: int = Query(0, description="Номер недели (0 - текущая)")
):
    try:
        html = client.get_schedule_html(group_id, week)
        schedule = parse_schedule(html)
        return schedule
    except Exception as e:
        print(f"Ошибка получения расписания: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/schedule/teacher")
async def get_schedule_teacher(
    staff_id: int = Query(..., description="ID преподавателя"),
    week: int = Query(0, description="Номер недели (0 - текущая)")
):
    try:
        html = client.get_teacher_schedule_html(staff_id, week)
        schedule = parse_schedule(html)
        return schedule
    except Exception as e:
        print(f"Ошибка получения расписания: {e}")
        raise HTTPException(status_code=500, detail=str(e))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)

app.mount("/static", StaticFiles(directory=STATIC_DIR, html=True), name="static")

@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    print("Сервер запущен: http://127.0.0.1:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
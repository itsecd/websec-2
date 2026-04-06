from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import datetime
import os
import requests
import uvicorn
from parser import parse_schedule
from catalog import GROUPS, TEACHERS

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

cache = {}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

def get_current_week():
    start = datetime.date(2025, 9, 1)
    today = datetime.date.today()
    diff = (today - start).days
    if diff < 0:
        return 1
    return (diff // 7) % 52 + 1

@app.get("/")
@app.get("/index.html")
async def root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/api/groups")
async def get_groups():
    return GROUPS

@app.get("/api/teachers")
async def get_teachers():
    return TEACHERS

@app.get("/api/schedule/{group_id}")
async def get_schedule(group_id: str, week: int = None):
    if not week:
        week = get_current_week()

    cache_key = f"group_{group_id}_{week}"
    if cache_key in cache:
        return cache[cache_key]

    try:
        url = f"https://ssau.ru/rasp?groupId={group_id}&selectedWeek={week}"
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()

        data = parse_schedule(response.text)
        if data:
            cache[cache_key] = data
        return data
    except Exception:
        return []

@app.get("/api/schedule/teacher/{teacher_id}")
async def get_teacher_schedule(teacher_id: str, week: int = None):
    if not week:
        week = get_current_week()

    cache_key = f"teacher_{teacher_id}_{week}"
    if cache_key in cache:
        return cache[cache_key]

    try:
        url = f"https://ssau.ru/rasp?staffId={teacher_id}&selectedWeek={week}"
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()

        data = parse_schedule(response.text)
        if data:
            cache[cache_key] = data
        return data
    except Exception:
        return []

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
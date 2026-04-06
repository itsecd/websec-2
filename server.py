from aiohttp import web
from aiohttp.web import Request, FileResponse

from parser import get_groups, get_teachers, get_schedule


async def handle_root(request: Request) -> FileResponse:
    return FileResponse("static/index.html")


async def handle_api_groups(request: Request) -> web.Response:
    try:
        groups = await get_groups()
        return web.json_response(groups)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def handle_api_teachers(request: Request) -> web.Response:
    try:
        teachers = await get_teachers()
        return web.json_response(teachers)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def handle_api_schedule(request: Request) -> web.Response:
    type_param = request.query.get("type", "group")
    id_param = request.query.get("id")
    week_param = request.query.get("week")
    
    if not id_param:
        return web.json_response({"error": "Need id"}, status=400)
    
    if type_param not in ["group", "teacher"]:
        return web.json_response({"error": "type = group or teacher"}, status=400)
    
    try:
        week = int(week_param) if week_param else None
        result = await get_schedule(type_param, id_param, week)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


app = web.Application()

app.router.add_get("/", handle_root)
app.router.add_get("/api/groups", handle_api_groups)
app.router.add_get("/api/teachers", handle_api_teachers)
app.router.add_get("/api/schedule", handle_api_schedule)
app.router.add_static('/static/', path='static', name='static')



if __name__ == "__main__":
    web.run_app(app, host="127.0.0.1", port=8000)
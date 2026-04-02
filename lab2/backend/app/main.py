import httpx
import math
import uvicorn

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    yandex_rasp_api_key: str
    yandex_rasp_base_url: str = "https://api.rasp.yandex-net.ru/v3.0"
    
    class Config:
        env_file = ".env"

settings = Settings()

app = FastAPI(
    title="Pribyvalka API",
    description="API для расписания электричек и поездов",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIONS_CACHE: list[dict] = []
CACHE_LOADED: bool = False

async def load_stations_cache():
    """Загружает полный список станций и фильтрует ЖД станции"""
    global STATIONS_CACHE, CACHE_LOADED
    
    if CACHE_LOADED:
        return
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(
                f"{settings.yandex_rasp_base_url}/stations_list/",
                params={
                    "apikey": settings.yandex_rasp_api_key,
                    "lang": "ru_RU",
                    "format": "json"
                }
            )
            
            if response.status_code != 200:
                CACHE_LOADED = True
                return
            
            data = response.json()
            filtered = []
            
            for country in data.get("countries", []):
                if country.get("title") != "Россия":
                    continue
                
                for region in country.get("regions", []):
                    for settlement in region.get("settlements", []):
                        settlement_title = settlement.get("title", "")
                        
                        for station in settlement.get("stations", []):
                            transport_type = station.get("transport_type", "").lower()
                            station_type = station.get("station_type", "").lower()
                            
                            # Фильтруем: поезда ИЛИ электрички
                            if transport_type in ["train", "suburban"]:
                                # Исключаем не-ЖД станции
                                if station_type not in ["airport", "port", "bus_station", "port_point", "bus_stop", "wharf", "river_port", "marine_station"]:
                                    filtered.append({
                                        "code": station.get("codes", {}).get("yandex_code", ""),
                                        "title": station.get("title", ""),
                                        "short_title": settlement_title,
                                        "type": "station",
                                        "station_type": station_type,
                                        "latitude": station.get("latitude"),
                                        "longitude": station.get("longitude"),
                                        "direction": station.get("direction", "")
                                    })
            
            STATIONS_CACHE = filtered
            CACHE_LOADED = True
            
    except Exception:
        CACHE_LOADED = True

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Вычисляет расстояние между двумя точками по формуле Haversine"""
    R = 6371
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

async def yandex_request(endpoint: str, params: dict):
    """Запрос к Яндекс API. При ошибке возвращает пустой ответ."""
    url = f"{settings.yandex_rasp_base_url}/{endpoint}/"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                url,
                params={**params, "apikey": settings.yandex_rasp_api_key},
                timeout=30.0
            )
            
            if response.status_code == 404:
                return {"stations": []} if "station" in endpoint else {"schedule": []}
            elif response.status_code == 403:
                raise HTTPException(status_code=403, detail="Invalid API key")
            elif response.status_code != 200:
                return {"stations": []} if "station" in endpoint else {"schedule": []}
            
            return response.json()
            
        except httpx.RequestError:
            return {"stations": []} if "station" in endpoint else {"schedule": []}


@app.post("/api/cache/load")
async def trigger_cache_load():
    """Принудительно загружает кэш станций"""
    if not CACHE_LOADED:
        await load_stations_cache()
    
    return {
        "loaded": CACHE_LOADED,
        "count": len(STATIONS_CACHE)
    }

@app.get("/api/stations/search")
async def search_stations(
    text: str = Query(..., min_length=2, description="Название станции для поиска"),
    limit: int = Query(20, description="Максимальное количество результатов")
):
    """Поиск станций по названию с автодополнением"""
    if not CACHE_LOADED:
        await load_stations_cache()
    
    if not STATIONS_CACHE:
        return {"stations": []}
    
    search_lower = text.lower()
    results = [
        s for s in STATIONS_CACHE
        if search_lower in s["title"].lower() or 
           search_lower in s["short_title"].lower()
    ]
    
    def sort_key(station):
        title = station["title"].lower()
        short = station["short_title"].lower()
        if title.startswith(search_lower) or short.startswith(search_lower):
            return 0
        return 1
    
    results.sort(key=sort_key)
    
    return {"stations": results[:limit]}

@app.get("/api/stations/nearby")
async def get_nearby_stations(
    lat: float = Query(..., description="Широта текущей позиции"),
    lng: float = Query(..., description="Долгота текущей позиции"),
    distance: float = Query(50, le=500, description="Радиус поиска в км (макс. 500)"),
    limit: int = Query(50, le=100, description="Максимальное количество станций (макс. 100)")
):
    """Поиск ближайших станций по географическим координатам"""
    if CACHE_LOADED and STATIONS_CACHE:
        nearby = []
        
        for station in STATIONS_CACHE:
            if station.get("latitude") and station.get("longitude"):
                dist = calculate_distance(
                    lat, lng,
                    station["latitude"],
                    station["longitude"]
                )
                
                if dist <= distance:
                    station_with_distance = station.copy()
                    station_with_distance["distance"] = round(dist, 2)
                    nearby.append(station_with_distance)
        
        nearby.sort(key=lambda x: x["distance"])
        return {"stations": nearby[:limit]}
    
    return await yandex_request("nearest_stations", {
        "lat": str(lat),
        "lng": str(lng),
        "distance": str(distance),
        "transport_types": "suburban",
        "lang": "ru_RU",
        "format": "json",
        "limit": str(limit)
    })

@app.get("/api/schedule/station/{station_code}")
async def get_station_schedule(
    station_code: str,
    direction: str = Query("all"),
    date: Optional[str] = None,
    only_suburban: bool = Query(True, description="Вернуть только электрички")
):
    """Расписание для станции"""
    params = {
        "station": station_code,
        "transport_types": "suburban" if only_suburban else "train,suburban",
        "direction": direction,
        "lang": "ru_RU",
        "format": "json"
    }
    if date:
        params["date"] = date
    
    data = await yandex_request("schedule", params)
    
    if only_suburban and data.get("schedule"):
        data["schedule"] = [
            item for item in data["schedule"]
            if item.get("thread", {}).get("transport_type") == "suburban"
        ]
    
    return data

@app.get("/api/schedule/route")
async def get_route_schedule(
    from_code: str = Query(..., description="Код станции отправления"),
    to_code: str = Query(..., description="Код станции назначения"),
    date: Optional[str] = Query(None, description="Дата в формате YYYY-MM-DD"),
    include_trains: bool = Query(True, description="Включить поезда дальнего следования")
):
    """Расписание между двумя станциями (электрички + поезда)"""
    url = f"{settings.yandex_rasp_base_url}/search/"
    
    transport_types = "suburban,train" if include_trains else "suburban"
    
    params = {
        "from": from_code,
        "to": to_code,
        "transport_types": transport_types,
        "lang": "ru_RU",
        "format": "json"
    }
    if date:
        params["date"] = date
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                url,
                params={**params, "apikey": settings.yandex_rasp_api_key},
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "segments" in data:
                    filtered_segments = []
                    for seg in data["segments"]:
                        thread = seg.get("thread", {})
                        transport_type = thread.get("transport_type", "")
                        
                        if transport_type in ["suburban", "train"]:
                            filtered_segments.append(seg)
                    
                    data["segments"] = filtered_segments
                
                return data
            else:
                return {"segments": [], "error": f"API error: {response.status_code}"}
                
        except Exception as exc:
            return {"segments": [], "error": f"Network error: {str(exc)}"}

@app.get("/api/favorites")
async def get_favorites():
    """Получить список избранных станций"""
    return {"favorites": []}

@app.post("/api/favorites/{station_code}")
async def add_favorite(station_code: str):
    """Добавить станцию в избранное"""
    return {"status": "added", "code": station_code}

@app.delete("/api/favorites/{station_code}")
async def remove_favorite(station_code: str):
    """Удалить станцию из избранного"""
    return {"status": "removed", "code": station_code}

@app.get("/health")
async def health_check():
    """Проверка работоспособности сервера"""
    return {
        "status": "ok",
        "message": "Backend is running",
        "cache_loaded": CACHE_LOADED,
        "stations_count": len(STATIONS_CACHE)
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
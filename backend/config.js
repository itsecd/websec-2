import "dotenv/config";

export const PORT = Number(process.env.PORT || 3001);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
export const CLIENT_ORIGINS = String(process.env.CLIENT_ORIGINS || CLIENT_ORIGIN)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
export const YANDEX_RASP_API_KEY = process.env.YANDEX_RASP_API_KEY || "";
export const YANDEX_RASP_API_BASE =
    process.env.YANDEX_RASP_API_BASE || "https://api.rasp.yandex-net.ru/v3.0";
export const STATION_CACHE_MAX_AGE_HOURS = Number(process.env.STATION_CACHE_MAX_AGE_HOURS || 24);
export const STATION_SEARCH_LIMIT = Number(process.env.STATION_SEARCH_LIMIT || 12);
export const NEAREST_STATION_LIMIT = Number(process.env.NEAREST_STATION_LIMIT || 8);

export const RAIL_STATION_TYPES = [
    "station",
    "platform",
    "stop",
    "checkpoint",
    "post",
    "crossing",
    "overtaking_point",
    "train_station",
    "unknown",
];

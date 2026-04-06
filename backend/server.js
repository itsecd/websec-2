import cors from "cors";
import express from "express";
import { CLIENT_ORIGINS, NEAREST_STATION_LIMIT, PORT, STATION_SEARCH_LIMIT } from "./config.js";
import { searchNearbyStationsFromIndex, searchStationsByName } from "./services/stationIndex.js";
import { getStationSchedule, searchRoutesBetweenStations } from "./services/yandexRasp.js";

const app = express();

function isAllowedOrigin(origin) {
    if (!origin) {
        return true;
    }

    if (CLIENT_ORIGINS.includes(origin)) {
        return true;
    }

    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

app.use(
    cors({
        origin(origin, callback) {
            if (isAllowedOrigin(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error(`CORS blocked for origin: ${origin}`));
        },
    }),
);
app.use(express.json());

function sendError(response, error, fallbackMessage) {
    console.error("[api]", error);
    response.status(error.statusCode || 500).json({
        error: error.message || fallbackMessage,
    });
}

app.get("/api/ping", (_request, response) => {
    response.json({
        ok: true,
        now: new Date().toISOString(),
    });
});

app.get("/api/stations/suggest", async (request, response) => {
    try {
        const searchText = String(request.query.searchText || "");
        const limit = Number(request.query.limit || STATION_SEARCH_LIMIT);
        const stations = await searchStationsByName(searchText, limit);

        response.json({
            stations,
        });
    } catch (error) {
        sendError(response, error, "Не удалось выполнить поиск станций.");
    }
});

app.get("/api/stations/nearby", async (request, response) => {
    try {
        const latitude = Number(request.query.lat);
        const longitude = Number(request.query.lng);
        const distance = Number(request.query.distance || 15);
        const limit = Number(request.query.limit || NEAREST_STATION_LIMIT);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            response.status(400).json({
                error: "Для поиска по карте нужны координаты lat и lng.",
            });
            return;
        }

        const stations = await searchNearbyStationsFromIndex(latitude, longitude, distance, limit);

        response.json({
            stations,
        });
    } catch (error) {
        sendError(response, error, "Не удалось получить станции рядом с выбранной точкой.");
    }
});

app.get("/api/stations/:stationCode/schedule", async (request, response) => {
    try {
        const stationCode = String(request.params.stationCode || "");
        const date = String(request.query.date || "");

        if (!stationCode) {
            response.status(400).json({
                error: "Не передан код станции.",
            });
            return;
        }

        const schedule = await getStationSchedule(stationCode, date);
        response.json(schedule);
    } catch (error) {
        sendError(response, error, "Не удалось загрузить расписание по станции.");
    }
});

app.get("/api/routes/search", async (request, response) => {
    try {
        const fromStationCode = String(request.query.from || "");
        const toStationCode = String(request.query.to || "");
        const date = String(request.query.date || "");

        if (!fromStationCode || !toStationCode) {
            response.status(400).json({
                error: "Для поиска маршрута нужно выбрать станции отправления и прибытия.",
            });
            return;
        }

        const routes = await searchRoutesBetweenStations(fromStationCode, toStationCode, date);
        response.json(routes);
    } catch (error) {
        sendError(response, error, "Не удалось загрузить маршруты между станциями.");
    }
});

app.listen(PORT, () => {
    console.log(`Backend started on http://localhost:${PORT}`);
});

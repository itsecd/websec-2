import { API_BASE_URL } from "../config/app";

async function requestJson(pathname, params = {}) {
    const requestUrl = new URL(pathname, `${API_BASE_URL}/`);

    for (const [parameterName, parameterValue] of Object.entries(params)) {
        if (parameterValue === undefined || parameterValue === null || parameterValue === "") {
            continue;
        }

        requestUrl.searchParams.set(parameterName, String(parameterValue));
    }

    let response;

    try {
        response = await fetch(requestUrl);
    } catch (error) {
        console.error("API network error", requestUrl.toString(), error);
        throw new Error(
            `Не удалось подключиться к серверу. Проверьте, что backend запущен по адресу ${API_BASE_URL}.`,
        );
    }

    const responseText = await response.text();
    let payload = {};

    if (responseText) {
        try {
            payload = JSON.parse(responseText);
        } catch (error) {
            console.error("API response parse error", requestUrl.toString(), responseText);
            throw new Error("Сервер вернул некорректный ответ.");
        }
    }

    if (!response.ok) {
        console.error("API request failed", response.status, payload);
        throw new Error(payload.error || "Не удалось выполнить запрос.");
    }

    return payload;
}

export async function suggestStations(searchText, limit = 8) {
    return requestJson("stations/suggest", { searchText, limit });
}

export async function loadNearbyStations(lat, lng, distance, limit = 8) {
    return requestJson("stations/nearby", { lat, lng, distance, limit });
}

export async function loadStationSchedule(stationCode, date) {
    return requestJson(`stations/${stationCode}/schedule`, { date });
}

export async function loadRoutesBetweenStations(fromStationCode, toStationCode, date) {
    return requestJson("routes/search", {
        from: fromStationCode,
        to: toStationCode,
        date,
    });
}

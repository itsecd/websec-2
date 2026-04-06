import { NEAREST_STATION_LIMIT, YANDEX_RASP_API_BASE, YANDEX_RASP_API_KEY } from "../config.js";
import { createHttpError, fetchJson } from "../utils/fetchJson.js";

function ensureApiKey() {
    if (!YANDEX_RASP_API_KEY) {
        throw createHttpError(
            503,
            "Не указан ключ Яндекс.Расписаний. Добавьте YANDEX_RASP_API_KEY в backend/.env.",
        );
    }
}

function buildUrl(pathname, params) {
    const url = new URL(pathname, `${YANDEX_RASP_API_BASE}/`);
    url.searchParams.set("apikey", YANDEX_RASP_API_KEY);

    for (const [parameterName, parameterValue] of Object.entries(params || {})) {
        if (parameterValue === undefined || parameterValue === null || parameterValue === "") {
            continue;
        }

        url.searchParams.set(parameterName, String(parameterValue));
    }

    return url;
}

export async function requestYandex(pathname, params) {
    ensureApiKey();
    const normalizedPathname = pathname.replace(/^\//, "");
    const requestUrl = buildUrl(normalizedPathname, params);
    return fetchJson(requestUrl, `yandex:${pathname}`);
}

function mapStationInfo(station) {
    return {
        code: station.code || station.codes?.yandex_code || "",
        title: station.title || "",
        popularTitle: station.popular_title || "",
        shortTitle: station.short_title || "",
        stationType: station.station_type || "",
        stationTypeName: station.station_type_name || "",
        transportType: station.transport_type || "",
        direction: station.direction || "",
        settlement: station.settlement || "",
        region: station.region || "",
        lat: station.lat ?? station.latitude ?? null,
        lng: station.lng ?? station.longitude ?? null,
        displayLabel: [station.title, station.settlement, station.region]
            .filter(Boolean)
            .join(", "),
    };
}

function normalizeScheduleEntry(rawEntry) {
    return {
        key: [
            rawEntry.thread?.uid || rawEntry.thread?.title || "thread",
            rawEntry.arrival || "",
            rawEntry.departure || "",
        ].join("|"),
        arrival: rawEntry.arrival || "",
        departure: rawEntry.departure || "",
        isFuzzy: Boolean(rawEntry.is_fuzzy),
        days: rawEntry.days || "",
        exceptDays: rawEntry.except_days || "",
        stops: rawEntry.stops || "",
        platform: rawEntry.platform || "",
        terminal: rawEntry.terminal || "",
        thread: {
            uid: rawEntry.thread?.uid || "",
            title: rawEntry.thread?.title || "",
            shortTitle: rawEntry.thread?.short_title || "",
            number: rawEntry.thread?.number || "",
            carrier: rawEntry.thread?.carrier?.title || "",
            transportType: rawEntry.thread?.transport_type || "",
            transportSubtype: rawEntry.thread?.transport_subtype?.title || "",
            expressType: rawEntry.thread?.express_type || "",
        },
    };
}

function mergeScheduleResponses(arrivalResponse, departureResponse) {
    const mergedEntries = new Map();

    for (const responseChunk of [arrivalResponse, departureResponse]) {
        for (const rawEntry of responseChunk.schedule || []) {
            const normalizedEntry = normalizeScheduleEntry(rawEntry);
            const existingEntry = mergedEntries.get(normalizedEntry.key);

            if (!existingEntry) {
                mergedEntries.set(normalizedEntry.key, normalizedEntry);
                continue;
            }

            mergedEntries.set(normalizedEntry.key, {
                ...existingEntry,
                ...normalizedEntry,
                arrival: existingEntry.arrival || normalizedEntry.arrival,
                departure: existingEntry.departure || normalizedEntry.departure,
                platform: existingEntry.platform || normalizedEntry.platform,
                terminal: existingEntry.terminal || normalizedEntry.terminal,
            });
        }
    }

    return [...mergedEntries.values()].sort((leftEntry, rightEntry) => {
        const leftTime = Date.parse(leftEntry.departure || leftEntry.arrival || 0);
        const rightTime = Date.parse(rightEntry.departure || rightEntry.arrival || 0);
        return leftTime - rightTime;
    });
}

function formatTicketInfo(ticketInfo) {
    const firstPlace = ticketInfo?.places?.[0];

    if (!firstPlace?.price?.whole) {
        return "";
    }

    const currencySymbol = firstPlace.currency === "RUB" ? "₽" : firstPlace.currency;
    return `от ${firstPlace.price.whole} ${currencySymbol}`;
}

function mapRouteSegment(rawSegment, isInterval = false) {
    return {
        key: [
            rawSegment.thread?.uid || rawSegment.thread?.title || "route",
            rawSegment.departure || "",
            rawSegment.arrival || "",
            isInterval ? "interval" : "regular",
        ].join("|"),
        isInterval,
        departure: rawSegment.departure || "",
        arrival: rawSegment.arrival || "",
        departurePlatform: rawSegment.departure_platform || "",
        arrivalPlatform: rawSegment.arrival_platform || "",
        departureTerminal: rawSegment.departure_terminal || "",
        arrivalTerminal: rawSegment.arrival_terminal || "",
        duration: rawSegment.duration || 0,
        startDate: rawSegment.start_date || "",
        stops: rawSegment.stops || "",
        days: rawSegment.days || "",
        hasTransfers: Boolean(rawSegment.has_transfers),
        ticketText: formatTicketInfo(rawSegment.tickets_info),
        from: mapStationInfo(rawSegment.from || {}),
        to: mapStationInfo(rawSegment.to || {}),
        thread: {
            uid: rawSegment.thread?.uid || "",
            title: rawSegment.thread?.title || "",
            shortTitle: rawSegment.thread?.short_title || "",
            number: rawSegment.thread?.number || "",
            carrier: rawSegment.thread?.carrier?.title || "",
            vehicle: rawSegment.thread?.vehicle || "",
            transportType: rawSegment.thread?.transport_type || "",
            transportSubtype: rawSegment.thread?.transport_subtype?.title || "",
            intervalDensity: rawSegment.thread?.interval?.density || "",
        },
    };
}

export async function getNearbyStations(
    latitude,
    longitude,
    distance,
    limit = NEAREST_STATION_LIMIT,
) {
    const response = await requestYandex("nearest_stations/", {
        lang: "ru_RU",
        format: "json",
        lat: latitude,
        lng: longitude,
        distance,
        limit,
        transport_types: "suburban",
        station_types:
            "station,platform,stop,train_station,checkpoint,post,crossing,overtaking_point,unknown",
    });

    return (response.stations || []).map((station) => ({
        ...mapStationInfo(station),
        distance: station.distance || 0,
        typeChoices: station.type_choices || {},
    }));
}

export async function getStationSchedule(stationCode, date) {
    const requestParams = {
        station: stationCode,
        date,
        lang: "ru_RU",
        format: "json",
        transport_types: "suburban",
    };

    const [arrivalResponse, departureResponse] = await Promise.all([
        requestYandex("schedule/", { ...requestParams, event: "arrival" }),
        requestYandex("schedule/", { ...requestParams, event: "departure" }),
    ]);

    return {
        date: departureResponse.date || arrivalResponse.date || date,
        station: mapStationInfo(departureResponse.station || arrivalResponse.station || {}),
        directions: departureResponse.directions || arrivalResponse.directions || [],
        entries: mergeScheduleResponses(arrivalResponse, departureResponse),
    };
}

export async function searchRoutesBetweenStations(fromStationCode, toStationCode, date) {
    const response = await requestYandex("search/", {
        from: fromStationCode,
        to: toStationCode,
        date,
        lang: "ru_RU",
        format: "json",
        transport_types: "suburban",
        transfers: "true",
        limit: 50,
    });

    const intervalSegments = (response.interval_segments || []).map((segment) =>
        mapRouteSegment(segment, true),
    );
    const regularSegments = (response.segments || []).map((segment) => mapRouteSegment(segment));

    return {
        search: response.search || {},
        from: mapStationInfo(response.search?.from || {}),
        to: mapStationInfo(response.search?.to || {}),
        segments: [...regularSegments, ...intervalSegments].sort((leftSegment, rightSegment) => {
            const leftTime = Date.parse(leftSegment.departure || 0);
            const rightTime = Date.parse(rightSegment.departure || 0);
            return leftTime - rightTime;
        }),
    };
}

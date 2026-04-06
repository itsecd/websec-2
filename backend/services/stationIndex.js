import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    RAIL_STATION_TYPES,
    STATION_CACHE_MAX_AGE_HOURS,
    STATION_SEARCH_LIMIT,
} from "../config.js";
import { normalizeText } from "../utils/normalizeText.js";
import { requestYandex } from "./yandexRasp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheDirectory = path.join(__dirname, "..", ".cache");
const cacheFilePath = path.join(cacheDirectory, "suburban-stations.json");
const cacheMaxAgeMs = STATION_CACHE_MAX_AGE_HOURS * 60 * 60 * 1000;

let stationIndex = null;
let stationIndexPromise = null;

const SEARCH_SCORE = {
    exactTitle: 120,
    exactAlternativeTitle: 100,
    titlePrefix: 70,
    alternativeTitlePrefix: 60,
    settlementExactMatch: 50,
    titleWordBoundaryPrefix: 40,
    regionExactMatch: 20,
    suburbanTransport: 12,
    stationTypePriority: 8,
};

const PREFERRED_STATION_TYPES = new Set(["train_station", "station"]);

function getStationSearchFields(station) {
    return {
        title: normalizeText(station.title),
        popularTitle: normalizeText(station.popularTitle),
        shortTitle: normalizeText(station.shortTitle),
        settlement: normalizeText(station.settlement),
        region: normalizeText(station.region),
    };
}

function startsWithWholeWord(value, query) {
    return value.startsWith(`${query} `) || value.startsWith(`${query}-`);
}

function getStationTypePriority(station) {
    if (PREFERRED_STATION_TYPES.has(station.stationType)) {
        return SEARCH_SCORE.stationTypePriority;
    }

    return 0;
}

function getTransportPriority(station) {
    if (station.transportType === "suburban") {
        return SEARCH_SCORE.suburbanTransport;
    }

    return 0;
}

function getSourcePriority(station) {
    if (station.transportType === "suburban") {
        return 2;
    }

    if (station.direction) {
        return 1;
    }

    return 0;
}

function isRailOrSuburbanStation(station) {
    if (!station?.codes?.yandex_code) {
        return false;
    }

    if (station.transport_type === "suburban" || station.transport_type === "train") {
        return true;
    }

    if (station.direction) {
        return true;
    }

    return RAIL_STATION_TYPES.includes(station.station_type);
}

function buildStationRecord(station, settlementTitle, regionTitle, countryTitle) {
    const stationCode = station.codes?.yandex_code;

    return {
        code: stationCode,
        title: station.title,
        popularTitle: station.popular_title || "",
        shortTitle: station.short_title || "",
        stationType: station.station_type,
        transportType: station.transport_type,
        direction: station.direction || "",
        lat: station.latitude ?? null,
        lng: station.longitude ?? null,
        settlement: settlementTitle || "",
        region: regionTitle || "",
        country: countryTitle || "",
        displayLabel: [station.title, settlementTitle, regionTitle].filter(Boolean).join(", "),
        searchKey: normalizeText(
            [
                station.title,
                station.popular_title,
                station.short_title,
                settlementTitle,
                regionTitle,
                countryTitle,
            ]
                .filter(Boolean)
                .join(" "),
        ),
    };
}

function calculateDistanceKm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
    const earthRadiusKm = 6371;
    const latitudeDelta = ((toLatitude - fromLatitude) * Math.PI) / 180;
    const longitudeDelta = ((toLongitude - fromLongitude) * Math.PI) / 180;
    const latitudeOne = (fromLatitude * Math.PI) / 180;
    const latitudeTwo = (toLatitude * Math.PI) / 180;

    const haversine =
        Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
        Math.cos(latitudeOne) *
            Math.cos(latitudeTwo) *
            Math.sin(longitudeDelta / 2) *
            Math.sin(longitudeDelta / 2);

    const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    return earthRadiusKm * angularDistance;
}

function getSearchScore(station, normalizedQuery) {
    const searchFields = getStationSearchFields(station);
    const hasExactAlternativeTitle =
        searchFields.popularTitle === normalizedQuery ||
        searchFields.shortTitle === normalizedQuery;
    const hasAlternativeTitlePrefix =
        searchFields.popularTitle.startsWith(normalizedQuery) ||
        searchFields.shortTitle.startsWith(normalizedQuery);
    let score = 0;

    if (searchFields.title === normalizedQuery) {
        score += SEARCH_SCORE.exactTitle;
    }

    if (hasExactAlternativeTitle) {
        score += SEARCH_SCORE.exactAlternativeTitle;
    }

    if (startsWithWholeWord(searchFields.title, normalizedQuery)) {
        score += SEARCH_SCORE.titleWordBoundaryPrefix;
    }

    if (searchFields.title.startsWith(normalizedQuery)) {
        score += SEARCH_SCORE.titlePrefix;
    }

    if (hasAlternativeTitlePrefix) {
        score += SEARCH_SCORE.alternativeTitlePrefix;
    }

    if (searchFields.settlement === normalizedQuery) {
        score += SEARCH_SCORE.settlementExactMatch;
    }

    if (searchFields.region === normalizedQuery) {
        score += SEARCH_SCORE.regionExactMatch;
    }

    score += getTransportPriority(station);
    score += getStationTypePriority(station);

    return score;
}

function flattenStationsList(payload) {
    const stationMap = new Map();

    for (const country of payload.countries || []) {
        for (const region of country.regions || []) {
            for (const settlement of region.settlements || []) {
                for (const station of settlement.stations || []) {
                    if (!isRailOrSuburbanStation(station)) {
                        continue;
                    }

                    const stationRecord = buildStationRecord(
                        station,
                        settlement.title,
                        region.title,
                        country.title,
                    );

                    if (!stationRecord.code) {
                        continue;
                    }

                    const existingStation = stationMap.get(stationRecord.code);

                    if (!existingStation) {
                        stationMap.set(stationRecord.code, stationRecord);
                        continue;
                    }

                    const currentPriority = getSourcePriority(existingStation);
                    const nextPriority = getSourcePriority(stationRecord);

                    if (nextPriority > currentPriority) {
                        stationMap.set(stationRecord.code, stationRecord);
                    }
                }
            }
        }
    }

    return [...stationMap.values()].sort((leftStation, rightStation) => {
        if (leftStation.transportType !== rightStation.transportType) {
            return leftStation.transportType === "suburban" ? -1 : 1;
        }

        return leftStation.displayLabel.localeCompare(rightStation.displayLabel, "ru");
    });
}

async function readCacheFile() {
    try {
        const rawFile = await fs.readFile(cacheFilePath, "utf8");
        const parsedFile = JSON.parse(rawFile);

        if (!parsedFile?.createdAt || !Array.isArray(parsedFile?.stations)) {
            return null;
        }

        const ageMs = Date.now() - new Date(parsedFile.createdAt).getTime();
        if (ageMs > cacheMaxAgeMs) {
            return null;
        }

        return parsedFile.stations;
    } catch {
        return null;
    }
}

async function writeCacheFile(stations) {
    await fs.mkdir(cacheDirectory, { recursive: true });
    await fs.writeFile(
        cacheFilePath,
        JSON.stringify(
            {
                createdAt: new Date().toISOString(),
                stations,
            },
            null,
            2,
        ),
        "utf8",
    );
}

async function downloadStationsList() {
    const payload = await requestYandex("stations_list/", {
        lang: "ru_RU",
        format: "json",
    });

    const stations = flattenStationsList(payload);
    await writeCacheFile(stations);
    return stations;
}

export async function getStationIndex() {
    if (stationIndex) {
        return stationIndex;
    }

    if (!stationIndexPromise) {
        stationIndexPromise = (async () => {
            const cachedStations = await readCacheFile();

            if (cachedStations) {
                stationIndex = cachedStations;
                return cachedStations;
            }

            const downloadedStations = await downloadStationsList();
            stationIndex = downloadedStations;
            return downloadedStations;
        })();
    }

    try {
        return await stationIndexPromise;
    } finally {
        stationIndexPromise = null;
    }
}

export async function searchStationsByName(searchText, limit = STATION_SEARCH_LIMIT) {
    const normalizedQuery = normalizeText(searchText);

    if (!normalizedQuery) {
        return [];
    }

    const stations = await getStationIndex();

    return stations
        .filter((station) => station.searchKey.includes(normalizedQuery))
        .map((station) => ({
            station,
            score: getSearchScore(station, normalizedQuery),
        }))
        .sort((leftMatch, rightMatch) => {
            if (leftMatch.score !== rightMatch.score) {
                return rightMatch.score - leftMatch.score;
            }

            return leftMatch.station.displayLabel.localeCompare(
                rightMatch.station.displayLabel,
                "ru",
            );
        })
        .slice(0, limit)
        .map((match) => match.station);
}

export async function searchNearbyStationsFromIndex(latitude, longitude, distanceKm, limit) {
    const stations = await getStationIndex();

    const closestStations = stations
        .filter((station) => station.lat != null && station.lng != null)
        .map((station) => ({
            ...station,
            distance: calculateDistanceKm(latitude, longitude, station.lat, station.lng),
        }))
        .sort((leftStation, rightStation) => leftStation.distance - rightStation.distance);

    const stationsInsideRadius = closestStations.filter(
        (station) => station.distance <= distanceKm,
    );
    const resultStations =
        stationsInsideRadius.length > 0
            ? stationsInsideRadius.slice(0, limit)
            : closestStations.slice(0, limit);

    return resultStations.map((station) => ({
        ...station,
        stationTypeName: "",
        typeChoices: {},
    }));
}

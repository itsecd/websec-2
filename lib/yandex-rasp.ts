import type {
  RouteScheduleResponse,
  StationScheduleResponse,
  StationSearchItem,
  YandexNearestStationsResponse,
  YandexScheduleResponse,
  YandexSearchResponse
} from "@/shared/types";
import { formatDuration } from "@/utils/format-duration";

const yandexRaspBaseUrl = process.env.YANDEX_RASP_BASE_URL ?? "https://api.rasp.yandex-net.ru/v3.0";
async function yandexFetch<T>(pathname: string, searchParams: URLSearchParams) {
  const apiKey = process.env.YANDEX_RASP_API_KEY;

  if (!apiKey) {
    throw new Error("YANDEX_RASP_API_KEY is not configured");
  }

  searchParams.set("apikey", apiKey);
  searchParams.set("format", "json");
  searchParams.set("lang", "ru_RU");

  const requestUrl = new URL(`${yandexRaspBaseUrl.replace(/\/$/, "")}${pathname}`);
  requestUrl.search = searchParams.toString();

  const response = await fetch(requestUrl, {
    next: { revalidate: 120 }
  });

  if (!response.ok) {
    throw new Error(`Yandex Rasp request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getStationSchedule(stationId: string, date: string): Promise<StationScheduleResponse> {
  try {
    const payload = await yandexFetch<YandexScheduleResponse>(
      "/schedule/",
      new URLSearchParams({
        station: stationId,
        transport_types: "suburban",
        date
      })
    );

    return {
      schedule: payload.schedule.map((item) => ({
        arrival: item.arrival,
        departure: item.departure,
        direction: item.direction,
        platform: item.platform || null,
        thread: item.thread
      }))
    };
  } catch {
    return { schedule: [] };
  }
}

export async function getRouteSchedule(
  fromStationId: string,
  toStationId: string,
  date: string
): Promise<RouteScheduleResponse> {
  try {
    const payload = await yandexFetch<YandexSearchResponse>(
      "/search/",
      new URLSearchParams({
        from: fromStationId,
        to: toStationId,
        transport_types: "suburban",
        date
      })
    );

    return {
      segments: payload.segments.map((segment) => ({
        arrival: segment.arrival,
        departure: segment.departure,
        durationLabel: formatDuration(segment.duration),
        thread: segment.thread
      }))
    };
  } catch {
    return { segments: [] };
  }
}

export async function getNearestStations(lat: number, lng: number): Promise<StationSearchItem[]> {
  const payload = await yandexFetch<YandexNearestStationsResponse>(
    "/nearest_stations/",
    new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      distance: "50"
    })
  );

  return payload.stations
    .filter(
      (station) =>
        station.transport_type === "train" &&
        Boolean(station.type_choices?.suburban) &&
        Boolean(station.code)
    )
    .map((station) => ({
      id: station.code,
      title: station.title,
      regionTitle: station.region?.title ?? null,
      settlementTitle: station.settlement?.title ?? null,
      latitude: station.lat,
      longitude: station.lng
    }));
}

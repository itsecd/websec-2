import { RouteScheduleResponse, StationScheduleResponse, StationSearchItem } from "@/lib/types";

const baseUrl = "https://api.rasp.yandex-net.ru/v3.0";
const railwayStationTypes = new Set([
  "station",
  "platform",
  "stop",
  "checkpoint",
  "post",
  "crossing",
  "overtaking_point",
  "train_station"
]);

async function yandexFetch<T>(pathname: string, searchParams: URLSearchParams) {
  const apiKey = process.env.YANDEX_RASP_API_KEY;

  if (!apiKey) {
    throw new Error("YANDEX_RASP_API_KEY is not configured");
  }

  searchParams.set("apikey", apiKey);
  searchParams.set("format", "json");
  searchParams.set("lang", "ru_RU");

  const response = await fetch(`${baseUrl}${pathname}?${searchParams.toString()}`, {
    next: { revalidate: 120 }
  });

  if (!response.ok) {
    throw new Error(`Yandex Rasp request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

type YandexScheduleResponse = {
  schedule: Array<{
    arrival: string | null;
    departure: string | null;
    thread: {
      uid: string;
      title: string;
      number: string;
    };
    platform: string;
    direction: string | null;
  }>;
};

type YandexSearchResponse = {
  segments: Array<{
    arrival: string;
    departure: string;
    duration: number;
    thread: {
      uid: string;
      title: string;
      number: string;
    };
  }>;
};

type YandexNearestStationsResponse = {
  stations: Array<{
    code: string;
    title: string;
    lat: number | null;
    lng: number | null;
    station_type?: string;
    transport_type?: string;
    region?: {
      title: string;
    };
    settlement?: {
      title: string;
    };
    type_choices?: {
      suburban?: {
        desktop_url: string;
        touch_url: string;
      };
    };
  }>;
};

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
function formatDuration(durationInSeconds: number) {
  const totalMinutes = Math.round(durationInSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} мин`;
  }

  if (minutes === 0) {
    return `${hours} ч`;
  }

  return `${hours} ч ${minutes} мин`;
}

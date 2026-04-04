import { StationSearchItem } from "@/lib/types";

export function createInitialStation(id: string | null, title: string | null): StationSearchItem | null {
  if (!id || !title) {
    return null;
  }

  return {
    id,
    title,
    regionTitle: null,
    settlementTitle: null,
    latitude: null,
    longitude: null
  };
}

export function buildStationBoardQuery(station: StationSearchItem, date: string) {
  const params = new URLSearchParams();
  params.set("mode", "station");
  params.set("stationId", station.id);
  params.set("stationTitle", station.title);
  params.set("date", date);
  return params.toString();
}

export function buildRouteQuery(fromStation: StationSearchItem, toStation: StationSearchItem, date: string) {
  const params = new URLSearchParams();
  params.set("mode", "route");
  params.set("fromStationId", fromStation.id);
  params.set("fromStationTitle", fromStation.title);
  params.set("toStationId", toStation.id);
  params.set("toStationTitle", toStation.title);
  params.set("date", date);
  return params.toString();
}

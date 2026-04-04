export type SearchParams = {
  mode: "station" | "route";
  stationId: string | null;
  stationTitle: string | null;
  fromStationId: string | null;
  fromStationTitle: string | null;
  toStationId: string | null;
  toStationTitle: string | null;
  date: string;
};

export function parseSearchParams(input: Record<string, string | string[] | undefined>): SearchParams {
  return {
    mode: readMode(input.mode),
    stationId: readString(input.stationId),
    stationTitle: readString(input.stationTitle),
    fromStationId: readString(input.fromStationId),
    fromStationTitle: readString(input.fromStationTitle),
    toStationId: readString(input.toStationId),
    toStationTitle: readString(input.toStationTitle),
    date: readDate(input.date)
  };
}

function readMode(value: string | string[] | undefined): SearchParams["mode"] {
  return value === "route" ? "route" : "station";
}

function readString(value: string | string[] | undefined) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return null;
}

function readDate(value: string | string[] | undefined) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

import { cache } from "react";
import type { StationIndexItem } from "@/shared/types";
import { promises as fs } from "node:fs";
import path from "node:path";

const stationIndexPath = path.join(process.cwd(), "data", "station-index.json");

export const readStationIndex = cache(async () => {
  try {
    const file = await fs.readFile(stationIndexPath, "utf8");
    return JSON.parse(file) as StationIndexItem[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("station-index.json is missing. Run npm run prepare:stations");
    }

    throw new Error("Failed to read station index");
  }
});

export async function searchStationsByTitle(query: string) {
  const normalized = query.trim().toLowerCase();

  if (normalized.length < 2) {
    return [] as StationIndexItem[];
  }

  const stations = await readStationIndex();

  return stations
    .filter((station) =>
      [station.title, station.settlementTitle, station.regionTitle]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized))
    )
    .slice(0, 12);
}

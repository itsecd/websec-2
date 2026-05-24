import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const apiKey = process.env.YANDEX_RASP_API_KEY;
const yandexRaspBaseUrl = process.env.YANDEX_RASP_BASE_URL ?? "https://api.rasp.yandex-net.ru/v3.0";

if (!apiKey) {
  console.error("YANDEX_RASP_API_KEY is required");
  process.exit(1);
}

const requestUrl = new URL(`${yandexRaspBaseUrl.replace(/\/$/, "")}/stations_list/`);
requestUrl.searchParams.set("apikey", apiKey);
requestUrl.searchParams.set("format", "json");
requestUrl.searchParams.set("lang", "ru_RU");

const response = await fetch(requestUrl);

if (!response.ok) {
  console.error(`Yandex Rasp request failed with ${response.status}`);
  process.exit(1);
}

const payload = await response.json();
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
const stations = [];

for (const country of payload.countries ?? []) {
  for (const region of country.regions ?? []) {
    for (const settlement of region.settlements ?? []) {
      for (const station of settlement.stations ?? []) {
        if (!station.codes?.yandex_code || !station.title) {
          continue;
        }

        if (!railwayStationTypes.has(station.station_type ?? "")) {
          continue;
        }

        stations.push({
          id: station.codes.yandex_code,
          title: station.title,
          regionTitle: region.title ?? null,
          settlementTitle: settlement.title ?? null,
          latitude: station.latitude ?? null,
          longitude: station.longitude ?? null
        });
      }
    }
  }
}

const outputPath = path.join(process.cwd(), "data", "station-index.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(stations, null, 2), "utf8");
console.log(`Saved ${stations.length} stations to ${outputPath}`);

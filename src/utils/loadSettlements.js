import Papa from "papaparse";
import rawCsv from "../data/top.csv?raw";

export function loadSettlements() {
  return new Promise((resolve, reject) => {
    Papa.parse(rawCsv, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
      complete: (results) => {
        try {
          const cleaned = results.data
            .map((item) => ({
              name: item.name?.trim(),
              region: item.region?.trim() || "",
              population: Number(item.population),
              lat: Number(item.lat),
              lon: Number(item.lon),
            }))
            .filter(
              (item) =>
                item.name &&
                Number.isFinite(item.population) &&
                Number.isFinite(item.lat) &&
                Number.isFinite(item.lon)
            );

          resolve(cleaned);
        } catch (error) {
          reject(error);
        }
      },
      error: reject,
    });
  });
}
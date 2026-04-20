#!/usr/bin/env node
/**
 * Build a settlements JSON file from a Tochno-style CSV.
 *
 * Expected input:
 *   - delimiter: semicolon
 *   - UTF-8
 *   - columns containing name, region, latitude, longitude, population
 *
 * Usage:
 *   node scripts/build-data.js input.csv data/settlements.json
 *
 * Notes:
 *   - The script is intentionally tolerant: it tries to find headers by keyword.
 *   - It keeps the top 1000 rows by population.
 */

const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/build-data.js input.csv data/settlements.json");
  process.exit(1);
}

function parseCsvLine(line, delimiter = ";") {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[«»"'`]/g, "")
    .replace(/[.,:;()/\\\-]/g, " ");
}

function findColumn(headers, patterns) {
  for (const [index, header] of headers.entries()) {
    const normalized = normalizeHeader(header);
    if (patterns.some((pattern) => pattern.test(normalized))) {
      return index;
    }
  }
  return -1;
}

function toNumber(value) {
  if (value === undefined || value === null) return null;
  let str = String(value).trim();
  if (!str) return null;
  str = str.replace(/\s+/g, "");
  str = str.replace(",", ".");
  str = str.replace(/[^0-9.\-]/g, "");
  const num = Number(str);
  if (!Number.isFinite(num)) return null;
  return num;
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

const csv = fs.readFileSync(path.resolve(inputPath), "utf8");
const lines = csv.split(/\r?\n/).filter(Boolean);

if (lines.length < 2) {
  console.error("CSV looks empty.");
  process.exit(1);
}

const headers = parseCsvLine(lines[0], ";");

const nameIdx = findColumn(headers, [
  /(^| )name($| )/,
  /наименован/,
  /населённый пункт/,
  /населенный пункт/,
  /object_name/,
  /settlement/,
  /city/
]);

const regionIdx = findColumn(headers, [
  /region/,
  /область/,
  /край/,
  /республик/,
  /subject/,
  /federal/,
  /district/
]);

const latIdx = findColumn(headers, [
  /(^| )lat($| )/,
  /latitude/,
  /широт/
]);

const lonIdx = findColumn(headers, [
  /(^| )lon($| )/,
  /longitude/,
  /долгот/
]);

const popIdx = findColumn(headers, [
  /population/,
  /населен/,
  /численност/
]);

if (nameIdx === -1 || latIdx === -1 || lonIdx === -1 || popIdx === -1) {
  console.error("Could not detect required columns.");
  console.error({ nameIdx, regionIdx, latIdx, lonIdx, popIdx, headers: headers.slice(0, 30) });
  process.exit(1);
}

const rows = [];
for (let i = 1; i < lines.length; i += 1) {
  const fields = parseCsvLine(lines[i], ";");
  const name = cleanText(fields[nameIdx]);
  const region = regionIdx >= 0 ? cleanText(fields[regionIdx]) : "";
  const lat = toNumber(fields[latIdx]);
  const lon = toNumber(fields[lonIdx]);
  const population = toNumber(fields[popIdx]);

  if (
  !name ||
  lat === null ||
  lon === null ||
  population === null ||
  (lat === 0 && lon === 0) ||
  lat < -90 || lat > 90 ||
  lon < -180 || lon > 180
  ) {
    continue;
  }

  rows.push({
    name,
    region,
    lat,
    lon,
    population: Math.round(population)
  });
}

rows.sort((a, b) => b.population - a.population || a.name.localeCompare(b.name, "ru"));
const top1000 = rows.slice(0, 1000);

fs.writeFileSync(path.resolve(outputPath), JSON.stringify(top1000, null, 2), "utf8");
console.log(`Saved ${top1000.length} settlements to ${outputPath}`);

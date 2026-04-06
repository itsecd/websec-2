const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

app.use(express.static(path.join(__dirname, "public")));

function parseCoordinate(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatUtcDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDateRangeForFiveDaysUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);
  return {
    start: formatUtcDate(start),
    end: formatUtcDate(end),
  };
}

function buildCacheKey(lat, lon, start, end) {
  return `${lat.toFixed(4)}:${lon.toFixed(4)}:${start}:${end}`;
}

app.get("/api/weather", async (req, res) => {
  const lat = parseCoordinate(req.query.lat);
  const lon = parseCoordinate(req.query.lon);

  if (lat === null || lon === null) {
    return res.status(400).json({
      error: "Missing or invalid coordinates. Expected lat and lon query params.",
    });
  }

  const token = process.env.EOL_API_TOKEN || req.query.token;
  if (!token) {
    return res.status(401).json({
      error: "Missing API token. Set EOL_API_TOKEN or pass ?token=...",
    });
  }

  const { start, end } = getDateRangeForFiveDaysUtc();
  const cacheKey = buildCacheKey(lat, lon, start, end);
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.payload);
  }

  const upstreamUrl = new URL("https://projecteol.ru/api/weather/");
  upstreamUrl.searchParams.set("lat", lat.toString());
  upstreamUrl.searchParams.set("lon", lon.toString());
  upstreamUrl.searchParams.set("date", `${start},${end}`);
  upstreamUrl.searchParams.set("token", token);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
    });

    if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
      const detailText = await upstreamResponse.text();
      return res.status(upstreamResponse.status).json({
        error: "Access denied by weather provider. Check API token.",
        details: detailText.slice(0, 500),
      });
    }

    if (!upstreamResponse.ok) {
      const detailText = await upstreamResponse.text();
      return res.status(502).json({
        error: "Weather provider request failed.",
        upstreamStatus: upstreamResponse.status,
        details: detailText.slice(0, 500),
      });
    }

    const upstreamPayload = await upstreamResponse.json();
    const payload = {
      lat,
      lon,
      dateRangeUtc: { start, end },
      forecast: upstreamPayload,
    };

    cache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return res.json(payload);
  } catch (error) {
    return res.status(502).json({
      error: "Could not reach weather provider.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

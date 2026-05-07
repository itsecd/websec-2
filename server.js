const path = require("node:path");
const express = require("express");
const cheerio = require("cheerio");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SSAU_BASE = "https://ssau.ru";
const SEARCH_URL = `${SSAU_BASE}/rasp/search`;
const RASP_URL = `${SSAU_BASE}/rasp`;
const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 WebSecLab/2.0 (+local student project)",
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
};

const cache = new Map();

function cleanText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCached(key, ttlMs) {
  const hit = cache.get(key);

  if (!hit) {
    return null;
  }

  if (Date.now() - hit.time > ttlMs) {
    cache.delete(key);
    return null;
  }

  return hit.value;
}

function setCached(key, value) {
  cache.set(key, { time: Date.now(), value });
  return value;
}

function cookieHeader(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
  }

  const raw = headers.get("set-cookie");

  if (!raw) {
    return "";
  }

  return raw
    .split(/,(?=[^;,]+=)/)
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function fetchSsau(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...REQUEST_HEADERS,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`SSAU returned ${response.status}: ${text.slice(0, 180)}`);
  }

  return response;
}

function normalizeSearchResults(items) {
  return items
    .map((item) => {
      const url = new URL(item.url, SSAU_BASE);
      const isTeacher = url.searchParams.has("staffId");
      const idParam = isTeacher ? "staffId" : "groupId";
      const id = Number(url.searchParams.get(idParam));

      if (!Number.isFinite(id)) {
        return null;
      }

      return {
        id,
        type: isTeacher ? "teacher" : "group",
        text: cleanText(item.text),
        url: `${url.pathname}${url.search}`,
      };
    })
    .filter(Boolean);
}

async function searchSsau(query) {
  const normalizedQuery = cleanText(query);
  const cacheKey = `search:${normalizedQuery.toLowerCase()}`;
  const cached = getCached(cacheKey, 120000);

  if (cached) {
    return cached;
  }

  const landingResponse = await fetchSsau(RASP_URL);
  const landingHtml = await landingResponse.text();
  const csrf = /name="csrf-token"\s+content="([^"]+)"/.exec(landingHtml)?.[1];
  const cookies = cookieHeader(landingResponse.headers);

  if (!csrf) {
    throw new Error("Не удалось получить CSRF-токен для поиска");
  }

  const body = new URLSearchParams({ text: normalizedQuery });
  const searchResponse = await fetchSsau(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRF-TOKEN": csrf,
      Cookie: cookies,
      Accept: "application/json, text/plain, */*",
    },
    body,
  });

  const rawItems = await searchResponse.json();
  return setCached(cacheKey, normalizeSearchResults(rawItems));
}

function parseLesson($, lessonNode) {
  const $lesson = $(lessonNode);
  const classText = [
    $lesson.attr("class") || "",
    $lesson.find("[class*='lesson-type-']").map((_, node) => $(node).attr("class")).get().join(" "),
  ].join(" ");
  const typeId = Number(/lesson-type-(\d+)/.exec(classText)?.[1] || 0) || null;
  const groups = [];

  $lesson.find(".schedule__group").each((_, groupNode) => {
    const $group = $(groupNode);
    const href = $group.attr("href") || "";
    const groupId = Number(new URL(href, SSAU_BASE).searchParams.get("groupId"));

    groups.push({
      id: Number.isFinite(groupId) ? groupId : null,
      name: cleanText($group.text()),
    });
  });

  return {
    typeId,
    type: cleanText($lesson.find(".schedule__lesson-type-chip").first().text()),
    discipline: cleanText($lesson.find(".schedule__discipline").first().text()),
    place: cleanText($lesson.find(".schedule__place").first().text()),
    teacher: cleanText($lesson.find(".schedule__teacher").first().text()),
    groups,
    comment: cleanText($lesson.find(".schedule__comment").first().text()),
  };
}

function parseTimetable(html, sourceUrl) {
  const $ = cheerio.load(html);
  const title = cleanText($("title").first().text()).replace(/\s+-\s+Самарский университет$/, "");
  const headerTitle = cleanText($(".page-header h1").last().text()) || title;
  const entityName = /^Расписание,\s*(.+)$/i.exec(headerTitle)?.[1] || headerTitle;
  const $grid = $(".schedule__items").first();

  if (!$grid.length) {
    throw new Error("На странице не найдена таблица расписания");
  }

  const currentWeek = Number(/\d+/.exec(cleanText($(".week-nav-current_week").first().text()))?.[0] || 0) || null;
  const currentDate = cleanText($(".week-nav-current_date").first().text());
  const days = $(".schedule__items > .schedule__item.schedule__head")
    .toArray()
    .slice(1)
    .map((node, index) => ({
      index,
      weekday: cleanText($(node).find(".schedule__head-weekday").text()),
      date: cleanText($(node).find(".schedule__head-date").text()),
    }));

  const children = $grid.children().toArray();
  const headerCount = days.length + 1;
  const rows = [];

  for (let index = headerCount; index < children.length;) {
    const $time = $(children[index]);

    if (!$time.hasClass("schedule__time")) {
      index += 1;
      continue;
    }

    const times = $time
      .find(".schedule__time-item")
      .map((_, node) => cleanText($(node).text()))
      .get();
    const row = {
      timeStart: times[0] || "",
      timeEnd: times[1] || "",
      cells: [],
    };

    index += 1;

    for (let dayIndex = 0; dayIndex < days.length && index < children.length; dayIndex += 1, index += 1) {
      const $cell = $(children[index]);
      const lessons = $cell
        .find("> .schedule__lesson")
        .toArray()
        .map((lessonNode) => parseLesson($, lessonNode));

      row.cells.push({ dayIndex, lessons });
    }

    rows.push(row);
  }

  const lessonsCount = rows.reduce(
    (total, row) => total + row.cells.reduce((sum, cell) => sum + cell.lessons.length, 0),
    0,
  );

  return {
    title: headerTitle,
    entityName,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    week: {
      current: currentWeek,
      date: currentDate,
      previous: currentWeek && currentWeek > 1 ? currentWeek - 1 : null,
      next: currentWeek && currentWeek < 52 ? currentWeek + 1 : null,
      all: Array.from({ length: 52 }, (_, index) => index + 1),
    },
    days,
    rows,
    summary: {
      lessonsCount,
      filledCells: rows.reduce(
        (total, row) => total + row.cells.filter((cell) => cell.lessons.length > 0).length,
        0,
      ),
    },
  };
}

async function loadSchedule(type, id, week, refresh = false) {
  const idParam = type === "teacher" ? "staffId" : "groupId";
  const params = new URLSearchParams({ [idParam]: String(id) });

  if (week) {
    params.set("selectedWeek", String(week));
  }

  const sourcePath = `/rasp?${params.toString()}`;
  const cacheKey = `schedule:${sourcePath}`;
  const cached = refresh ? null : getCached(cacheKey, 90000);

  if (cached) {
    return cached;
  }

  const response = await fetchSsau(`${SSAU_BASE}${sourcePath}`);
  const html = await response.text();
  return setCached(cacheKey, parseTimetable(html, `${SSAU_BASE}${sourcePath}`));
}

app.use("/vendor/jquery.min.js", express.static(path.join(__dirname, "node_modules", "jquery", "dist", "jquery.min.js")));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/search", async (req, res) => {
  const query = cleanText(req.query.query);
  const type = cleanText(req.query.type);

  if (query.length < 2) {
    res.json({ items: [] });
    return;
  }

  try {
    let items = await searchSsau(query);

    if (type === "group" || type === "teacher") {
      items = items.filter((item) => item.type === type);
    }

    res.json({ items: items.slice(0, 12) });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get("/api/schedule", async (req, res) => {
  const type = cleanText(req.query.type);
  const id = Number(req.query.id);
  const week = Number(req.query.week || 0) || null;

  if (!["group", "teacher"].includes(type) || !Number.isFinite(id)) {
    res.status(400).json({ error: "Нужно указать type=group|teacher и числовой id" });
    return;
  }

  try {
    res.json(await loadSchedule(type, id, week, Boolean(req.query.refresh)));
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`WebSec 2 schedule app: http://localhost:${PORT}`);
  });
}

module.exports = {
  app,
  normalizeSearchResults,
  parseTimetable,
};

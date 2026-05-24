const path = require("path");
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = "https://ssau.ru";
const ROOT_URL = `${BASE_URL}/rasp`;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

app.use(express.static(path.join(__dirname, "public")));

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function cacheGet(key) {
  const record = cache.get(key);
  if (!record || record.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return record.value;
}

function cacheSet(key, value) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function buildAbsoluteUrl(url) {
  if (!url) {
    return "";
  }
  return new URL(url, BASE_URL).toString();
}

function extractIdFromHref(href, key) {
  if (!href) {
    return null;
  }
  const url = new URL(href, BASE_URL);
  return url.searchParams.get(key);
}

function parseSearchResult(item) {
  const absoluteUrl = buildAbsoluteUrl(item.url);
  const url = new URL(absoluteUrl);
  const groupId = url.searchParams.get("groupId");
  const staffId = url.searchParams.get("staffId");
  const type = groupId ? "group" : staffId ? "teacher" : "unknown";

  return {
    id: item.id,
    text: item.text,
    type,
    groupId,
    staffId,
    url: absoluteUrl,
  };
}

function extractLessonTypeClass($lesson) {
  const className = $lesson.find(".schedule__lesson-type-chip").attr("class") || "";
  const match = className.match(/lesson-type-\d+/);
  return match ? match[0] : "lesson-type-4";
}

function parseLessons($, cell) {
  return $(cell)
    .find(".schedule__lesson")
    .map((_, lesson) => {
      const $lesson = $(lesson);
      return {
        discipline: normalizeText($lesson.find(".schedule__discipline").text()),
        type: normalizeText($lesson.find(".schedule__lesson-type-chip").text()),
        typeClass: extractLessonTypeClass($lesson),
        place: normalizeText($lesson.find(".schedule__place").text()),
        teachers: $lesson
          .find(".schedule__teacher a")
          .map((__, anchor) => ({
            name: normalizeText($(anchor).text()),
            staffId: extractIdFromHref($(anchor).attr("href"), "staffId"),
          }))
          .get(),
        teacherText: normalizeText($lesson.find(".schedule__teacher").text()),
        groups: $lesson
          .find(".schedule__group")
          .map((__, anchor) => ({
            name: normalizeText($(anchor).text()),
            groupId: extractIdFromHref($(anchor).attr("href"), "groupId"),
          }))
          .get(),
        groupText: normalizeText($lesson.find(".schedule__groups").text()),
        comment: normalizeText($lesson.find(".schedule__comment").text()),
      };
    })
    .get();
}

function parseWeekNavigation($) {
  const currentText = normalizeText($(".week-nav-current_week").text());
  const currentWeekMatch = currentText.match(/(\d+)/);
  const currentWeek = currentWeekMatch ? Number(currentWeekMatch[1]) : null;

  const prevHref = $(".week-nav-prev").attr("href");
  const nextHref = $(".week-nav-next").attr("href");
  const prevWeek = prevHref ? Number(new URL(prevHref, BASE_URL).searchParams.get("selectedWeek")) : null;
  const nextWeek = nextHref ? Number(new URL(nextHref, BASE_URL).searchParams.get("selectedWeek")) : null;

  return {
    currentWeek,
    currentDate: normalizeText($(".week-nav-current_date").text()),
    prevWeek,
    nextWeek,
  };
}

function parseDays($) {
  return $(".schedule__item.schedule__head")
    .slice(1)
    .map((_, header) => ({
      weekday: normalizeText($(header).find(".schedule__head-weekday").text()),
      date: normalizeText($(header).find(".schedule__head-date").text()),
    }))
    .get();
}

function parseSchedule($) {
  if (!$(".schedule").length) {
    return null;
  }

  const children = $(".schedule__items").children().toArray();
  const headersCount = 7;
  const days = parseDays($);
  const slots = [];

  for (let index = headersCount; index < children.length; index += 7) {
    const timeNode = children[index];
    const cellNodes = children.slice(index + 1, index + 7);
    const timeParts = $(timeNode)
      .find(".schedule__time-item")
      .map((_, item) => normalizeText($(item).text()))
      .get();

    const start = timeParts[0] || "";
    const end = timeParts[1] || "";

    slots.push({
      time: {
        start,
        end,
        label: [start, end].filter(Boolean).join(" - "),
      },
      cells: cellNodes.map((cell) => ({
        lessons: parseLessons($, cell),
      })),
    });
  }

  return { days, slots };
}

function parseEntityInfo($, entityType, entityId) {
  return {
    title: normalizeText($(".page-header h1").text()),
    name: normalizeText($(".info-block__title").text()),
    description: $(".info-block__description div")
      .map((_, node) => normalizeText($(node).text()))
      .get()
      .filter(Boolean),
    yearStart: normalizeText($(".info-block__semester").text()),
    entityType,
    entityId,
  };
}

function parseEmptyState($) {
  const text = normalizeText($(".card-default.flex-column.p-4").text());
  return text || null;
}

async function getRootContext() {
  const response = await axios.get(ROOT_URL, {
    timeout: 20000,
    headers: {
      "User-Agent": "Mozilla/5.0 Codex Lab Client",
    },
  });

  const tokenMatch = response.data.match(/name="csrf-token" content="([^"]+)"/);
  const token = tokenMatch ? tokenMatch[1] : null;
  const cookies = (response.headers["set-cookie"] || []).map((cookie) => cookie.split(";")[0]).join("; ");

  if (!token) {
    throw new Error("Не удалось получить CSRF-токен SSAU.");
  }

  return { token, cookies };
}

async function searchSsau(term) {
  const cacheKey = `search:${term}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const { token, cookies } = await getRootContext();
  const response = await axios.post(
    `${ROOT_URL}/search`,
    { text: term },
    {
      timeout: 20000,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Cookie": cookies,
        "Referer": ROOT_URL,
        "User-Agent": "Mozilla/5.0 Codex Lab Client",
        "X-CSRF-TOKEN": token,
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );

  const data = Array.isArray(response.data) ? response.data.map(parseSearchResult) : [];
  cacheSet(cacheKey, data);
  return data;
}

async function fetchTimetable(entityType, entityId, week) {
  const params = new URLSearchParams();
  params.set(entityType === "teacher" ? "staffId" : "groupId", entityId);
  if (week) {
    params.set("selectedWeek", week);
  }

  const cacheKey = `timetable:${entityType}:${entityId}:${week || "auto"}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await axios.get(`${ROOT_URL}?${params.toString()}`, {
    timeout: 20000,
    headers: {
      "User-Agent": "Mozilla/5.0 Codex Lab Client",
    },
  });

  const $ = cheerio.load(response.data);
  const schedule = parseSchedule($);
  const result = {
    entity: parseEntityInfo($, entityType, entityId),
    week: parseWeekNavigation($),
    emptyState: schedule ? null : parseEmptyState($),
    schedule,
    sourceUrl: `${ROOT_URL}?${params.toString()}`,
  };

  cacheSet(cacheKey, result);
  return result;
}

app.get("/api/search", async (req, res) => {
  const query = normalizeText(req.query.q);
  if (!query || query.length < 2) {
    res.json([]);
    return;
  }

  try {
    const results = await searchSsau(query);
    res.json(results);
  } catch (error) {
    res.status(502).json({
      error: "Не удалось получить результаты поиска с сайта SSAU.",
      details: error.message,
    });
  }
});

app.get("/api/timetable", async (req, res) => {
  const groupId = normalizeText(req.query.groupId);
  const staffId = normalizeText(req.query.staffId);
  const week = normalizeText(req.query.week || req.query.selectedWeek);

  const entityType = staffId ? "teacher" : groupId ? "group" : null;
  const entityId = staffId || groupId;

  if (!entityType || !entityId) {
    res.status(400).json({ error: "Нужно передать groupId или staffId." });
    return;
  }

  try {
    const timetable = await fetchTimetable(entityType, entityId, week);
    res.json(timetable);
  } catch (error) {
    res.status(502).json({
      error: "Не удалось получить расписание с сайта SSAU.",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

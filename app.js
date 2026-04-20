/* global L, Chart, $ */

const App = (() => {
  const state = {
    settlements: [],
    filtered: [],
    markers: [],
    map: null,
    layer: null,
    selected: null,
    chartInstances: {
      temp: null,
      precip: null,
      wind: null
    },
    abortController: null,
    tokenKey: "projectEolToken",
    lastQuery: ""
  };

  const els = {};

  function qs(selector) {
    return document.querySelector(selector);
  }

  function qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function debounce(fn, delay = 200) {
    let timer = null;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), delay);
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatPopulation(pop) {
    const num = Number(pop);
    if (!Number.isFinite(num)) return "—";
    return new Intl.NumberFormat("ru-RU").format(num);
  }

  function formatCoord(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    return num.toFixed(4);
  }

  function populationRadius(pop) {
    const num = Number(pop) || 0;
    const r = Math.log10(Math.max(num, 1)) * 1.8 - 2.2;
    return Math.min(11, Math.max(4, r));
  }

  function isLikelyRussianSettlement(item) {
    return item
      && Number.isFinite(Number(item.lat))
      && Number.isFinite(Number(item.lon))
      && item.name;
  }

  async function loadSettlements() {
    const res = await fetch("data/settlements.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Не удалось загрузить settlements.json: ${res.status}`);
    }
    const data = await res.json();
    state.settlements = data
      .filter(isLikelyRussianSettlement)
      .map((item) => ({
        ...item,
        population: Number(item.population) || 0,
        lat: Number(item.lat),
        lon: Number(item.lon)
      }))
      .sort((a, b) => Number(b.population) - Number(a.population) || a.name.localeCompare(b.name, "ru"));
    state.filtered = [...state.settlements];
  }

  function initDom() {
    els.map = qs("#map");
    els.searchInput = qs("#searchInput");
    els.searchResults = qs("#searchResults");
    els.countAll = qs("#countAll");
    els.countShown = qs("#countShown");
    els.status = qs("#statusLine");
    els.sidebar = qs("#sidebar");
    els.tokenInput = qs("#tokenInput");
    els.saveTokenBtn = qs("#saveTokenBtn");
    els.clearTokenBtn = qs("#clearTokenBtn");
    els.modal = qs("#forecastModal");
    els.modalClose = qs("#closeModal");
    els.modalTitle = qs("#modalTitle");
    els.modalMeta = qs("#modalMeta");
    els.modalBody = qs("#modalBody");
    els.loading = qs("#loadingOverlay");
    els.resetBtn = qs("#resetBtn");
    els.useMyLocationBtn = qs("#useMyLocationBtn");
    els.locateNote = qs("#locateNote");
    els.legend = qs("#legend");
    els.tokenHint = qs("#tokenHint");
    els.quickLinks = qsa("[data-jump]");
  }

  function readToken() {
    return window.localStorage.getItem(state.tokenKey) || "";
  }

  function saveToken(value) {
    window.localStorage.setItem(state.tokenKey, value.trim());
  }

  function clearToken() {
    window.localStorage.removeItem(state.tokenKey);
  }

  function renderTokenState() {
    const token = readToken();
    $(els.tokenInput).val(token);
    $(els.tokenHint).text(token
      ? "Токен сохранён в браузере."
      : "Введите token от Project // Eol: он нужен для запросов к API.");
  }

  function initMap() {
    state.map = L.map("map", {
      zoomControl: false,
      preferCanvas: true
    }).setView([61.5, 105.3], 3);

    L.control.zoom({ position: "bottomright" }).addTo(state.map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(state.map);

    state.layer = L.layerGroup().addTo(state.map);
  }

  function settlementCardHtml(item) {
    return `
      <button class="search-result" data-name="${escapeHtml(item.name)}" data-lat="${item.lat}" data-lon="${item.lon}" data-pop="${item.population}">
        <div class="sr-top">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${formatPopulation(item.population)}</span>
        </div>
        <div class="sr-bottom">
          <span>${escapeHtml(item.region || "Россия")}</span>
          <span>${formatCoord(item.lat)}, ${formatCoord(item.lon)}</span>
        </div>
      </button>
    `;
  }

  function renderSearchResults(items) {
    if (!items.length) {
      $(els.searchResults).html(`
        <div class="empty-state">
          <p>Ничего не найдено.</p>
          <p>Попробуйте другое написание или выберите точку на карте.</p>
        </div>
      `);
      return;
    }

    $(els.searchResults).html(items.slice(0, 20).map(settlementCardHtml).join(""));
  }

  function renderStats() {
    $(els.countAll).text(formatPopulation(state.settlements.length));
    $(els.countShown).text(formatPopulation(state.filtered.length));
    const popSum = state.filtered.reduce((sum, item) => sum + (Number(item.population) || 0), 0);
    $(els.status).text(`Отобрано населённых пунктов: ${state.filtered.length}. Суммарное население в выборке: ${formatPopulation(popSum)}.`);
  }

  function clearMarkers() {
    state.layer.clearLayers();
    state.markers = [];
  }

  function focusSettlement(item, openPopup = true) {
    if (!item) return;
    state.selected = item;
    state.map.setView([item.lat, item.lon], Math.max(state.map.getZoom(), 8), { animate: true });
    if (openPopup) {
      openForecastModal(item);
    }
  }

  function buildMarker(item) {
    const color = item.population >= 1_000_000 ? "#d53f3f" : item.population >= 100_000 ? "#f59e0b" : "#2563eb";
    const marker = L.circleMarker([item.lat, item.lon], {
      radius: populationRadius(item.population),
      color,
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.75
    });

    marker.bindTooltip(`${item.name}`, { sticky: true, direction: "top" });
    marker.on("click", () => focusSettlement(item, true));
    marker.addTo(state.layer);
    state.markers.push({ item, marker });
  }

  function renderMap() {
    clearMarkers();
    state.filtered.forEach(buildMarker);
  }

  function matchesQuery(item, query) {
    if (!query) return true;
    const haystack = [
      item.name,
      item.region,
      item.district,
      item.alt_name,
      String(item.population)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function applyFilter(query) {
    state.lastQuery = query;
    state.filtered = state.settlements.filter((item) => matchesQuery(item, query));
    renderSearchResults(state.filtered);
    renderStats();
    renderMap();
  }

  function hookSearch() {
    els.searchInput.addEventListener("input", debounce((event) => {
      const query = event.target.value.trim();
      applyFilter(query);
    }, 120));

    els.searchInput.addEventListener("focus", () => {
      if (!els.searchResults.innerHTML.trim()) {
        renderSearchResults(state.filtered);
      }
    });

    els.searchResults.addEventListener("click", (event) => {
      const button = event.target.closest(".search-result");
      if (!button) return;
      const item = {
        name: button.dataset.name,
        lat: Number(button.dataset.lat),
        lon: Number(button.dataset.lon),
        population: Number(button.dataset.pop)
      };
      const found = state.settlements.find((row) => row.name === item.name && Math.abs(row.lat - item.lat) < 0.01 && Math.abs(row.lon - item.lon) < 0.01);
      focusSettlement(found || item, true);
    });

    els.resetBtn.addEventListener("click", () => {
      els.searchInput.value = "";
      applyFilter("");
      if (state.settlements.length) {
        state.map.setView([61.5, 105.3], 3, { animate: true });
      }
    });
  }

  function hookTokenControls() {
    renderTokenState();

    els.saveTokenBtn.addEventListener("click", () => {
      saveToken(els.tokenInput.value);
      renderTokenState();
      toast("Токен сохранён.");
    });

    els.clearTokenBtn.addEventListener("click", () => {
      clearToken();
      renderTokenState();
      toast("Токен удалён.");
    });
  }

  function openModal() {
    els.modal.classList.add("is-open");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    els.modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    destroyCharts();
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }
  }

  function hookModal() {
    els.modalClose.addEventListener("click", closeModal);
    els.modal.addEventListener("click", (event) => {
      if (event.target.matches("[data-modal-backdrop]")) {
        closeModal();
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && els.modal.classList.contains("is-open")) {
        closeModal();
      }
    });
  }

  function toast(message) {
    els.status.textContent = message;
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => renderStats(), 2200);
  }

  function normalizeForecastPayload(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.result)) return payload.result;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.forecast)) return payload.forecast;
    if (Array.isArray(payload.items)) return payload.items;
    if (payload.status === "done" && Array.isArray(payload.result)) return payload.result;
    return [];
  }

  function parseForecastRow(row) {
    const dt = row.dt_forecast || row.dt || row.datetime || row.time || row.timestamp || row.date;
    const date = dt ? new Date(dt) : null;
    const temp = row.temp_2_cel ?? row.temp_2 ?? row.temperature ?? row.temp;
    const precip = row.prate ?? row.precipitation ?? row.precip ?? row.rain ?? 0;
    const wind = row.wind_speed_10 ?? row.wind_speed ?? row.wind ?? row.speed ?? 0;
    return {
      dt: date && !Number.isNaN(date.getTime()) ? date : null,
      temp: Number(temp),
      precip: Number(precip),
      wind: Number(wind)
    };
  }

  function groupDaily(rows) {
    const bucket = new Map();

    rows.forEach((row) => {
      if (!row.dt) return;
      const key = row.dt.toISOString().slice(0, 10);
      if (!bucket.has(key)) {
        bucket.set(key, {
          key,
          temps: [],
          precips: [],
          winds: []
        });
      }
      const slot = bucket.get(key);
      if (Number.isFinite(row.temp)) slot.temps.push(row.temp);
      if (Number.isFinite(row.precip)) slot.precips.push(row.precip);
      if (Number.isFinite(row.wind)) slot.winds.push(row.wind);
    });

    return Array.from(bucket.values()).map((slot) => ({
      date: slot.key,
      temp: slot.temps.length ? slot.temps.reduce((a, b) => a + b, 0) / slot.temps.length : null,
      precip: slot.precips.length ? slot.precips.reduce((a, b) => a + b, 0) : null,
      wind: slot.winds.length ? slot.winds.reduce((a, b) => a + b, 0) / slot.winds.length : null
    }));
  }

  function destroyCharts() {
    Object.values(state.chartInstances).forEach((chart) => {
      if (chart) {
        chart.destroy();
      }
    });
    state.chartInstances.temp = null;
    state.chartInstances.precip = null;
    state.chartInstances.wind = null;
  }

  function renderChart(canvasId, label, values, lineLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    return new Chart(ctx, {
      type: "line",
      data: {
        labels: values.map((item) => item.date),
        datasets: [{
          label: lineLabel,
          data: values.map((item) => item.value),
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.35,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            display: true
          }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true
            }
          },
          y: {
            beginAtZero: false
          }
        }
      }
    });
  }

  function showSkeleton() {
    els.modalTitle.textContent = "Загрузка прогноза…";
    els.modalMeta.textContent = "Подготавливаем запрос к API";
    els.modalBody.innerHTML = `
      <div class="skeleton-grid">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-chart"></div>
        <div class="skeleton-chart"></div>
        <div class="skeleton-chart"></div>
      </div>
    `;
    openModal();
  }

  async function fetchForecast(item) {
    const token = readToken();
    if (!token) {
      throw new Error("Введите token от Project // Eol в левом блоке.");
    }

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 6);

    const dateStart = start.toISOString().slice(0, 10);
    const dateEnd = end.toISOString().slice(0, 10);
    const url = new URL("http://localhost:3000/api/weather");
    url.searchParams.set("lat", item.lat.toFixed(4));
    url.searchParams.set("lon", item.lon.toFixed(4));
    url.searchParams.set("date", `${dateStart},${dateEnd}`);
    url.searchParams.set("token", token);

    const response = await fetch(url.toString(), {
      method: "GET",
      mode: "cors"
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`API ответил ${response.status}. ${text.slice(0, 180)}`);
    }

    const payload = await response.json();
    return normalizeForecastPayload(payload);
  }

  function buildSummaryCards(item, daily) {
    const firstDay = daily[0] || {};
    const nextDays = daily.slice(0, 3);
    const avgTemp = nextDays.length
      ? nextDays
        .map((row) => row.temp)
        .filter((value) => Number.isFinite(value))
        .reduce((a, b) => a + b, 0) / nextDays.filter((row) => Number.isFinite(row.temp)).length
      : null;
    const totalPrecip = nextDays.reduce((sum, row) => sum + (Number.isFinite(row.precip) ? row.precip : 0), 0);
    const peakWind = Math.max(...nextDays.map((row) => Number.isFinite(row.wind) ? row.wind : 0), 0);

    return `
      <section class="summary-grid">
        <article class="summary-card">
          <span>Населённый пункт</span>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.region || "Россия")}</small>
        </article>
        <article class="summary-card">
          <span>Средняя температура</span>
          <strong>${avgTemp === null ? "—" : `${avgTemp.toFixed(1)} °C`}</strong>
          <small>Первые 3 дня прогноза</small>
        </article>
        <article class="summary-card">
          <span>Осадки</span>
          <strong>${totalPrecip.toFixed(1)} мм</strong>
          <small>Сумма за 3 дня</small>
        </article>
        <article class="summary-card">
          <span>Ветер</span>
          <strong>${peakWind.toFixed(1)} м/с</strong>
          <small>Максимум за 3 дня</small>
        </article>
      </section>
    `;
  }

  function renderForecastView(item, daily) {
    const tempData = daily.map((row) => ({ date: row.date.slice(5), value: row.temp }));
    const precipData = daily.map((row) => ({ date: row.date.slice(5), value: row.precip }));
    const windData = daily.map((row) => ({ date: row.date.slice(5), value: row.wind }));

    els.modalTitle.textContent = item.name;
    els.modalMeta.textContent = `${item.region || "Россия"} · ${formatCoord(item.lat)}, ${formatCoord(item.lon)} · население ${formatPopulation(item.population)}`;

    els.modalBody.innerHTML = `
      ${buildSummaryCards(item, daily)}
      <div class="chart-grid">
        <section class="chart-card">
          <header>
            <h4>Температура</h4>
            <p>Среднесуточная температура воздуха</p>
          </header>
          <div class="chart-wrap"><canvas id="tempChart"></canvas></div>
        </section>
        <section class="chart-card">
          <header>
            <h4>Осадки</h4>
            <p>Сумма осадков по дням</p>
          </header>
          <div class="chart-wrap"><canvas id="precipChart"></canvas></div>
        </section>
        <section class="chart-card">
          <header>
            <h4>Сила ветра</h4>
            <p>Средняя скорость ветра</p>
          </header>
          <div class="chart-wrap"><canvas id="windChart"></canvas></div>
        </section>
      </div>
      <div class="forecast-note">
        <p>Прогноз запрашивается по координатам через Project // Eol и сводится к дневным значениям, чтобы графики читались удобнее.</p>
      </div>
    `;

    destroyCharts();

    state.chartInstances.temp = renderChart(
      "tempChart",
      "Температура",
      tempData,
      "°C"
    );
    state.chartInstances.precip = renderChart(
      "precipChart",
      "Осадки",
      precipData,
      "мм"
    );
    state.chartInstances.wind = renderChart(
      "windChart",
      "Ветер",
      windData,
      "м/с"
    );
  }

  async function openForecastModal(item) {
    if (!item) return;
    showSkeleton();

    if (state.abortController) {
      state.abortController.abort();
    }
    state.abortController = new AbortController();

    try {
      const raw = await fetchForecast(item);
      const parsed = raw.map(parseForecastRow).filter((row) => row.dt);
      const daily = groupDaily(parsed).slice(0, 7);

      if (!daily.length) {
        throw new Error("API не вернуло данных для графиков.");
      }

      renderForecastView(item, daily);
    } catch (error) {
      els.modalTitle.textContent = item.name;
      els.modalMeta.textContent = `${item.region || "Россия"} · ${formatCoord(item.lat)}, ${formatCoord(item.lon)}`;
      els.modalBody.innerHTML = `
        <div class="error-box">
          <h3>Не удалось получить прогноз</h3>
          <p>${escapeHtml(error.message)}</p>
          <p>Проверьте token, доступ к API и формат ответа.</p>
        </div>
      `;
    }
  }

  function hookQuickLinks() {
    els.quickLinks.forEach((button) => {
      button.addEventListener("click", () => {
        const jump = button.dataset.jump;
        const target = document.querySelector(jump);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  function hookLocationButton() {
    els.useMyLocationBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        els.locateNote.textContent = "Геолокация недоступна в этом браузере.";
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          els.locateNote.textContent = `Ваши координаты: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          state.map.setView([latitude, longitude], 8, { animate: true });
        },
        () => {
          els.locateNote.textContent = "Не удалось получить геолокацию.";
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  function hookMapUi() {
    const infoBtn = qs("#infoBtn");
    if (infoBtn) {
      infoBtn.addEventListener("click", () => {
        const first = state.filtered[0];
        if (first) focusSettlement(first, true);
      });
    }
  }

  async function start() {
    initDom();
    initMap();
    hookSearch();
    hookTokenControls();
    hookModal();
    hookQuickLinks();
    hookLocationButton();
    hookMapUi();

    els.loading.classList.add("is-visible");
    try {
      await loadSettlements();
      renderSearchResults(state.filtered);
      renderStats();
      renderMap();

      if (state.filtered.length) {
        const bounds = L.latLngBounds(state.filtered.map((item) => [item.lat, item.lon]));
        state.map.fitBounds(bounds.pad(0.15));
      }
    } catch (error) {
      els.searchResults.innerHTML = `
        <div class="error-box">
          <h3>Ошибка загрузки данных</h3>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
      els.status.textContent = "Не удалось загрузить данные.";
    } finally {
      els.loading.classList.remove("is-visible");
    }
  }

  return { start };
})();

document.addEventListener("DOMContentLoaded", () => {
  App.start();
});

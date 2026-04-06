const state = {
  map: null,
  settlements: [],
  markersById: new Map(),
  charts: {},
  activeSettlement: null,
};

const defaultMapView = [60, 100];
const chartColors = {
  temp: "#bf4f2e",
  prate: "#2a7f9e",
  wind: "#4f6b2d",
};

$(init);

function init() {
  initMap();
  wireSearch();
  loadSettlements();

  $(window).on("resize", () => {
    if (state.map) {
      state.map.invalidateSize();
    }
    resizeCharts();
  });
}

function initMap() {
  state.map = L.map("map", {
    zoomControl: true,
    minZoom: 3,
  }).setView(defaultMapView, 3);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(state.map);

  requestAnimationFrame(() => {
    state.map.invalidateSize();
  });
}

function wireSearch() {
  $("#search-form").on("submit", function onSearchSubmit(event) {
    event.preventDefault();
    const query = $("#settlement-search").val().trim().toLowerCase();
    if (!query) {
      setStatus("Введите название населенного пункта.", "idle");
      return;
    }

    const match =
      state.settlements.find((item) => item.name.toLowerCase() === query) ||
      state.settlements.find((item) => item.name.toLowerCase().startsWith(query));

    if (!match) {
      setStatus("Населенный пункт не найден в списке из 1000.", "error");
      return;
    }

    openSettlement(match);
  });
}

function loadSettlements() {
  setStatus("Загружаем населенные пункты...", "loading");
  $.getJSON("data/settlements-top1000.json")
    .done((data) => {
      if (!Array.isArray(data) || data.length === 0) {
        setStatus("Файл с населенными пунктами пуст.", "error");
        return;
      }

      state.settlements = data;
      fillDatalist(data);
      drawMarkers(data);
      setStatus(`Загружено ${data.length} населенных пунктов. Нажмите на маркер или используйте поиск.`, "ready");
    })
    .fail((jqXHR) => {
      setStatus(`Не удалось загрузить settlements JSON (${jqXHR.status || "ошибка сети"}).`, "error");
    });
}

function fillDatalist(settlements) {
  const datalist = $("#settlements-list");
  datalist.empty();

  for (const settlement of settlements) {
    const option = $("<option>").attr("value", settlement.name);
    datalist.append(option);
  }
}

function drawMarkers(settlements) {
  settlements.forEach((settlement) => {
    const marker = L.circleMarker([settlement.lat, settlement.lon], {
      radius: 5,
      weight: 1,
      color: "#245869",
      fillColor: "#2f8d86",
      fillOpacity: 0.8,
    });

    marker.bindPopup(`<strong>${escapeHtml(settlement.name)}</strong><br>${escapeHtml(settlement.region)}`);
    marker.on("click", () => openSettlement(settlement));
    marker.addTo(state.map);
    state.markersById.set(settlement.id, marker);
  });
}

function openSettlement(settlement) {
  state.activeSettlement = settlement;

  state.map.flyTo([settlement.lat, settlement.lon], 8, {
    animate: true,
    duration: 0.75,
  });

  const marker = state.markersById.get(settlement.id);
  if (marker) {
    marker.openPopup();
  }

  renderPlaceCard(settlement);
  fetchWeather(settlement);
}

function renderPlaceCard(settlement) {
  const population = formatPopulation(settlement.population);
  const cardHtml = `
    <h2>${escapeHtml(settlement.name)}</h2>
    <p>${escapeHtml(settlement.region)}</p>
    <p>Население: ${population}</p>
    <p>Координаты: ${settlement.lat.toFixed(4)}, ${settlement.lon.toFixed(4)}</p>
  `;
  $("#place-card").html(cardHtml);
}

function formatPopulation(value) {
  if (value === null || value === undefined) {
    return "н/д";
  }
  const population = Number.parseInt(value, 10);
  if (!Number.isFinite(population) || population <= 0) {
    return "н/д";
  }
  return population.toLocaleString("ru-RU");
}

function fetchWeather(settlement) {
  setStatus(`Загружаем прогноз для ${settlement.name}...`, "loading");
  $("#charts").stop(true, true).addClass("hidden");

  const tokenFromInput = $("#token-input").val().trim();
  const query = {
    lat: settlement.lat,
    lon: settlement.lon,
  };

  if (tokenFromInput) {
    query.token = tokenFromInput;
  }

  $.ajax({
    url: "/api/weather",
    method: "GET",
    data: query,
    dataType: "json",
  })
    .done((payload) => {
      const rows = normalizeForecastRows(payload);
      if (!rows.length) {
        setStatus("Прогноз не вернул пригодных для отображения данных.", "error");
        return;
      }

      renderCharts(rows);
      setStatus(`Прогноз готов: ${rows.length} точек.`, "ready");

      const topTemp = rows[0].temp;
      const accent = Number.isFinite(topTemp) && topTemp <= 0 ? "#37639e" : "#25756a";
      $(document.documentElement).css("--accent", accent);
      $(document.documentElement).css("--accent-soft", hexToRgba(accent, 0.2));
    })
    .fail((jqXHR) => {
      const message = buildWeatherErrorMessage(jqXHR);
      setStatus(message, "error");
    });
}

function normalizeForecastRows(payload) {
  const root = payload && payload.forecast ? payload.forecast : payload;
  const list =
    (Array.isArray(root) && root) ||
    root?.data ||
    root?.forecast ||
    root?.result ||
    root?.items ||
    [];

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((item) => ({
      dt: item.dt_forecast || item.date || item.datetime || null,
      temp: toNumber(item.temp_2_cel),
      prate: toNumber(item.prate),
      wind: toNumber(item.wind_speed_10),
    }))
    .filter((item) => item.dt !== null)
    .sort((a, b) => String(a.dt).localeCompare(String(b.dt)));
}

function renderCharts(rows) {
  destroyCharts();

  const chartsElement = $("#charts");
  chartsElement.removeClass("hidden").hide();
  chartsElement.fadeIn(220, () => {
    const labels = rows.map((row) => formatLabel(row.dt));
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8 },
        },
      },
    };

    const tempCanvas = document.getElementById("chart-temp");
    const prateCanvas = document.getElementById("chart-prate");
    const windCanvas = document.getElementById("chart-wind");

    state.charts.temp = new Chart(tempCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [{ data: rows.map((r) => r.temp), borderColor: chartColors.temp, tension: 0.2 }],
      },
      options: commonOptions,
    });

    state.charts.prate = new Chart(prateCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{ data: rows.map((r) => r.prate), backgroundColor: chartColors.prate }],
      },
      options: commonOptions,
    });

    state.charts.wind = new Chart(windCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [{ data: rows.map((r) => r.wind), borderColor: chartColors.wind, tension: 0.2 }],
      },
      options: commonOptions,
    });

    requestAnimationFrame(() => {
      resizeCharts();
      setTimeout(resizeCharts, 120);
    });
  });
}

function destroyCharts() {
  Object.values(state.charts).forEach((chart) => chart.destroy());
  state.charts = {};
}

function resizeCharts() {
  Object.values(state.charts).forEach((chart) => chart.resize());
}

function setStatus(text, mode) {
  const panel = $("#forecast-panel");
  panel.removeClass("state-idle state-loading state-ready state-error");
  panel.addClass(`state-${mode}`);
  $("#status").text(text);
}

function buildWeatherErrorMessage(jqXHR) {
  const body = jqXHR.responseJSON || {};
  if (jqXHR.status === 401) {
    return "Токен отсутствует. Укажите EOL_API_TOKEN на сервере или введите токен в поле.";
  }
  if (jqXHR.status === 403) {
    return "Провайдер отклонил доступ. Проверьте токен и лимиты API.";
  }
  if (jqXHR.status === 502) {
    return `Ошибка внешнего погодного API: ${body.error || "запрос завершился неуспешно"}`;
  }
  return body.error || `Запрос погоды завершился ошибкой (${jqXHR.status || "ошибка сети"}).`;
}

function formatLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toISOString().slice(5, 16).replace("T", " ");
}

function toNumber(value) {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

function escapeHtml(raw) {
  return String(raw)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const int = Number.parseInt(normalized, 16);
  if (!Number.isInteger(int) || normalized.length !== 6) {
    return `rgba(37, 117, 106, ${alpha})`;
  }
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

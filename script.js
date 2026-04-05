$(() => {
  let cities = [];
  let tempChartObj = null;
  let precipChartObj = null;
  let windChartObj = null;

  const markerIcon = L.divIcon({
    className: "custom-marker-icon",
    html: '<div style="background-color: #9d8df1; width: 15px; height: 15px; border-radius: 50%; border: 2px white solid; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>',
    iconSize: [15, 15],
    iconAnchor: [7.5, 7.5],
  });

  const map = L.map("map", {
    center: [55.0, 60.0],
    zoom: 4,
    minZoom: 3,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0,
    zoomControl: false,
    attributionControl: false
  });

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    noWrap: true,
  }).addTo(map);

  const markersGroup = L.layerGroup().addTo(map);

  $.ajax({
    url: "settlements.csv",
    dataType: "text",
    success: (data) => {
      cities = parseCSV(data);
      renderCities(cities);
    },
    error: () => alert("Не удалось загрузить settlements.csv.")
  });

  const parseCSV = (text) => {
    return text.trim().split("\n").slice(1).map(line => {
      const row = line.split(",");
      if (row.length === 5) {
        return {
          name: row[0].trim(),
          region: row[1].trim(),
          population: row[2].trim(),
          lat: parseFloat(row[3]),
          lon: parseFloat(row[4]),
        };
      }
    }).filter(Boolean);
  };

  const openWeatherModal = (name, lat, lon) => {
    $("#modalCityName").text(`Прогноз: ${name.replace(/^г\.?\s+/i, "")}`);
    fetchWeather(lat, lon);
    $("#weatherModal").fadeIn();
  };

  const createMarker = (city) => {
    const marker = L.marker([city.lat, city.lon], { icon: markerIcon });
    marker.bindTooltip(
        `<div style="text-align:center;">
        <b style="font-size:14px; color:#9d8df1;">${city.name}</b><br>
        <span style="color:#777; font-size: 12px;">${parseInt(city.population).toLocaleString("ru-RU")} чел.</span>
      </div>`,
        { direction: 'top', offset: [0, -10], opacity: 0.95 }
    );
    marker.on("click", () => {
      map.flyTo([city.lat, city.lon], 10);
      openWeatherModal(city.name, city.lat, city.lon);
    });
    return marker;
  };

  const renderCities = (cityArray) => {
    $("#cityList").empty();
    markersGroup.clearLayers();

    cityArray.forEach((city) => {
      const marker = createMarker(city);
      const li = $(`<li>${city.name}</li>`);

      li.on("click", () => {
        map.flyTo([city.lat, city.lon], 10);
        openWeatherModal(city.name, city.lat, city.lon);
      });

      $("#cityList").append(li);
      markersGroup.addLayer(marker);
    });
  };

  $("#searchInput").on("input", function () {
    const query = $(this).val().toLowerCase();
    const filteredCities = cities.filter((city) => city.name.toLowerCase().includes(query));

    renderCities(filteredCities);
    $(this).css("border-color", filteredCities.length === 0 ? "#e74c3c" : "#ddd");
  });

  $(".close-btn").on("click", () => $("#weatherModal").fadeOut());

  $(window).on("click", (event) => {
    if (event.target === document.getElementById("weatherModal")) {
      $("#weatherModal").fadeOut();
    }
  });

  $("#toggleSidebarBtn").on("click", () => {
    $(".sidebar").toggleClass("collapsed");
    setTimeout(() => map.invalidateSize(), 300);
  });

  const fetchWeather = (lat, lon) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`;
    $.ajax({
      url: url,
      method: "GET",
      success: (data) => drawCharts(data.daily),
      error: () => alert("Не удалось загрузить данные о погоде."),
    });
  };

  const drawCharts = (dailyData) => {
    const labels = dailyData.time.map((dateStr) =>
        new Date(dateStr).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })
    );

    Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    Chart.defaults.color = "#666";

    if (tempChartObj) tempChartObj.destroy();
    if (precipChartObj) precipChartObj.destroy();
    if (windChartObj) windChartObj.destroy();

    const createChart = (id, type, datasets, titleText, yAxisLabel) => {
      return new Chart(document.getElementById(id).getContext("2d"), {
        type: type,
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: titleText, font: { size: 16 } } },
          scales: { y: { beginAtZero: type !== 'line', ticks: { callback: (value) => value + yAxisLabel } } },
        },
      });
    };

    tempChartObj = createChart("tempChart", "line", [
      {
        label: "Макс. темп. (°C)",
        data: dailyData.temperature_2m_max,
        borderColor: "#ff9f43",
        backgroundColor: "rgba(255, 159, 67, 0.1)",
        fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: "#ff9f43",
      },
      {
        label: "Мин. темп. (°C)",
        data: dailyData.temperature_2m_min,
        borderColor: "#d6a2e8",
        backgroundColor: "rgba(214, 162, 232, 0.1)",
        fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: "#d6a2e8",
      }
    ], "Температура воздуха", "°");

    precipChartObj = createChart("precipChart", "bar", [{
      label: "Осадки (мм)",
      data: dailyData.precipitation_sum,
      backgroundColor: "#5f27cd", borderRadius: 6,
    }], "Количество осадков", " мм");

    windChartObj = createChart("windChart", "line", [{
      label: "Макс. ветер (км/ч)",
      data: dailyData.wind_speed_10m_max,
      borderColor: "#1dd1a1", borderDash: [5, 5], fill: false, tension: 0.3, pointBackgroundColor: "#1dd1a1", pointRadius: 5,
    }], "Скорость ветра", " км/ч");
  };
});
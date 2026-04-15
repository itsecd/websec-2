
(function () {
  'use strict';
  const searchInput   = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const weatherPanel  = document.getElementById('weather-panel');
  const loadingPanel  = document.getElementById('loading-panel');
  const sidebarHint   = document.getElementById('sidebar-hint');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar       = document.getElementById('sidebar');

  const wpCityName = document.getElementById('wp-city-name');
  const wpRegion   = document.getElementById('wp-region');
  const wpTemp     = document.getElementById('wp-temp');
  const wpWind     = document.getElementById('wp-wind');
  const wpPrec     = document.getElementById('wp-prec');


  let chartTemp = null;
  let chartPrec = null;
  let chartWind = null;


  const C = {
    accent:  '#4af0b0',
    accent2: '#6b8cff',
    accent3: '#ff6b6b',
    muted:   '#4a5570',
    text:    '#d4dff0',
    grid:    'rgba(30,36,56,0.8)',
  };


  MapModule.init('map', onCitySelect);

  
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  
  searchInput.addEventListener('input', debounce(handleSearch, 180));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-wrap')) closeSearch();
  });

  function handleSearch() {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) { closeSearch(); return; }

    const matches = window.CITIES.filter(c =>
      c.name.toLowerCase().includes(q)
    ).slice(0, 8);

    if (!matches.length) { closeSearch(); return; }

    searchResults.innerHTML = matches.map((c, i) =>
      `<div class="search-item" data-idx="${i}">
        <span class="city-name">${highlight(c.name, q)}</span>
        <span class="city-pop">${fmtPop(c.pop)}</span>
      </div>`
    ).join('');

    
    searchResults._matches = matches;

    searchResults.querySelectorAll('.search-item').forEach((el) => {
      el.addEventListener('click', () => {
        const city = matches[+el.dataset.idx];
        searchInput.value = city.name;
        closeSearch();
        MapModule.flyTo(city);
        onCitySelect(city);
      });
    });

    searchResults.classList.add('visible');
  }

  function closeSearch() {
    searchResults.classList.remove('visible');
    searchResults.innerHTML = '';
  }

  function highlight(text, q) {
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return text.slice(0, idx)
      + `<strong style="color:var(--accent)">${text.slice(idx, idx + q.length)}</strong>`
      + text.slice(idx + q.length);
  }

  function fmtPop(n) {
    return n > 1000000
      ? (n / 1000000).toFixed(1) + ' млн'
      : (n / 1000).toFixed(0) + ' тыс.';
  }

  async function onCitySelect(city) {
    if (window.innerWidth <= 760) sidebar.classList.add('open');

    showLoading(city);

    try {
      const data = await WeatherAPI.getForecast(city.lat, city.lon);
      renderWeather(city, data);
    } catch (err) {
      console.error(err);
      showError();
    }
  }

  function showLoading(city) {
    sidebarHint.classList.add('hidden');
    weatherPanel.classList.add('hidden');
    loadingPanel.classList.remove('hidden');
  }

  function showError() {
    loadingPanel.classList.add('hidden');
    sidebarHint.classList.remove('hidden');
    sidebarHint.textContent = '⚠ Ошибка загрузки. Попробуйте ещё раз.';
  }

  function renderWeather(city, data) {
    loadingPanel.classList.add('hidden');
    sidebarHint.classList.add('hidden');
    weatherPanel.classList.remove('hidden');

  
    wpCityName.textContent = city.name;
    wpRegion.textContent   = city.region;

  
    wpTemp.textContent = data.current.temp + '°C';
    wpWind.textContent = data.current.wind + ' км/ч';
    wpPrec.textContent = data.todayPrecip.toFixed(1) + ' мм';

    const labels   = data.days.map(d => d.label);
    const temps    = data.days.map(d => ((d.tempMax + d.tempMin) / 2).toFixed(1));
    const tempMaxs = data.days.map(d => d.tempMax);
    const tempMins = data.days.map(d => d.tempMin);
    const precips  = data.days.map(d => d.precip);
    const winds    = data.days.map(d => d.wind);

    drawTempChart(labels, temps, tempMaxs, tempMins);
    drawPrecChart(labels, precips);
    drawWindChart(labels, winds);
  }

  const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#161924',
        borderColor: C.muted,
        borderWidth: 1,
        titleColor: C.text,
        bodyColor: C.text,
        padding: 10,
        cornerRadius: 6,
        titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
        bodyFont:  { family: "'JetBrains Mono', monospace", size: 11 },
      },
    },
    scales: {
      x: {
        grid: { color: C.grid },
        ticks: {
          color: C.muted,
          font: { family: "'JetBrains Mono', monospace", size: 10 },
        },
        border: { color: C.muted },
      },
      y: {
        grid: { color: C.grid },
        ticks: {
          color: C.muted,
          font: { family: "'JetBrains Mono', monospace", size: 10 },
        },
        border: { color: C.muted },
      },
    },
  };

  function destroyChart(instance) {
    if (instance) instance.destroy();
  }

  function drawTempChart(labels, avgs, maxs, mins) {
    destroyChart(chartTemp);
    const ctx = document.getElementById('chart-temp').getContext('2d');

    const gradFill = ctx.createLinearGradient(0, 0, 0, 100);
    gradFill.addColorStop(0, 'rgba(74,240,176,0.25)');
    gradFill.addColorStop(1, 'rgba(74,240,176,0)');

    chartTemp = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Средн.',
            data: avgs,
            borderColor: C.accent,
            backgroundColor: gradFill,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: C.accent,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          {
            label: 'Макс.',
            data: maxs,
            borderColor: C.accent3,
            borderWidth: 1,
            borderDash: [4, 3],
            tension: 0.4,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 3,
          },
          {
            label: 'Мин.',
            data: mins,
            borderColor: C.accent2,
            borderWidth: 1,
            borderDash: [4, 3],
            tension: 0.4,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 3,
          },
        ],
      },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          ...CHART_DEFAULTS.plugins,
          legend: {
            display: true,
            labels: {
              color: C.muted,
              font: { family: "'JetBrains Mono', monospace", size: 9 },
              boxWidth: 20,
              padding: 8,
            },
          },
          tooltip: {
            ...CHART_DEFAULTS.plugins.tooltip,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}°C`,
            },
          },
        },
        scales: {
          ...CHART_DEFAULTS.scales,
          y: {
            ...CHART_DEFAULTS.scales.y,
            ticks: {
              ...CHART_DEFAULTS.scales.y.ticks,
              callback: v => v + '°',
            },
          },
        },
      },
    });
  }

  function drawPrecChart(labels, data) {
    destroyChart(chartPrec);
    const ctx = document.getElementById('chart-prec').getContext('2d');

    const gradFill = ctx.createLinearGradient(0, 0, 0, 100);
    gradFill.addColorStop(0, 'rgba(107,140,255,0.5)');
    gradFill.addColorStop(1, 'rgba(107,140,255,0.05)');

    chartPrec = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Осадки',
          data,
          backgroundColor: gradFill,
          borderColor: C.accent2,
          borderWidth: 1.5,
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          ...CHART_DEFAULTS.plugins,
          tooltip: {
            ...CHART_DEFAULTS.plugins.tooltip,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y.toFixed(1)} мм`,
            },
          },
        },
        scales: {
          ...CHART_DEFAULTS.scales,
          y: {
            ...CHART_DEFAULTS.scales.y,
            beginAtZero: true,
            ticks: {
              ...CHART_DEFAULTS.scales.y.ticks,
              callback: v => v + ' мм',
            },
          },
        },
      },
    });
  }

  function drawWindChart(labels, data) {
    destroyChart(chartWind);
    const ctx = document.getElementById('chart-wind').getContext('2d');

    const gradFill = ctx.createLinearGradient(0, 0, 0, 100);
    gradFill.addColorStop(0, 'rgba(255,107,107,0.3)');
    gradFill.addColorStop(1, 'rgba(255,107,107,0)');

    chartWind = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Ветер',
          data,
          borderColor: C.accent3,
          backgroundColor: gradFill,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: C.accent3,
          pointRadius: 3,
          pointHoverRadius: 5,
        }],
      },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          ...CHART_DEFAULTS.plugins,
          tooltip: {
            ...CHART_DEFAULTS.plugins.tooltip,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y} км/ч`,
            },
          },
        },
        scales: {
          ...CHART_DEFAULTS.scales,
          y: {
            ...CHART_DEFAULTS.scales.y,
            beginAtZero: true,
            ticks: {
              ...CHART_DEFAULTS.scales.y.ticks,
              callback: v => v + ' км/ч',
            },
          },
        },
      },
    });
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
})();

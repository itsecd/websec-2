

window.WeatherAPI = (() => {

  const BASE = 'https://api.open-meteo.com/v1/forecast';

  const cache = new Map();
  const CACHE_TTL = 30 * 60 * 1000;


  async function getForecast(lat, lon) {
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    const now = Date.now();

    if (cache.has(key)) {
      const { ts, data } = cache.get(key);
      if (now - ts < CACHE_TTL) return data;
    }

    const params = new URLSearchParams({
      latitude:  lat,
      longitude: lon,
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'windspeed_10m_max',
        'weathercode',
      ].join(','),
      hourly: [
        'temperature_2m',
        'precipitation',
        'windspeed_10m',
      ].join(','),
      current_weather: true,
      timezone: 'auto',
      forecast_days: 7,
      windspeed_unit: 'kmh',
    });

    const url = `${BASE}?${params}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Open-Meteo error: ${resp.status}`);

    const raw = await resp.json();
    const data = parseResponse(raw);

    cache.set(key, { ts: now, data });
    return data;
  }

  
  function parseResponse(raw) {
    const { daily, hourly, current_weather } = raw;

   
    const days = daily.time.map((date, i) => ({
      date,
      label: formatDate(date),
      tempMax: daily.temperature_2m_max[i],
      tempMin: daily.temperature_2m_min[i],
      precip:  daily.precipitation_sum[i],
      wind:    daily.windspeed_10m_max[i],
      code:    daily.weathercode[i],
    }));

    const current = {
      temp:  Math.round(current_weather.temperature),
      wind:  Math.round(current_weather.windspeed),
      code:  current_weather.weathercode,
    };

    const hours = hourly.time.map((t, i) => ({
      time:  t,
      temp:  hourly.temperature_2m[i],
      prec:  hourly.precipitation[i] ?? 0,
      wind:  hourly.windspeed_10m[i],
    }));

  
    const todayPrecip = days[0]?.precip ?? 0;

    return { days, hours, current, todayPrecip };
  }

  function formatDate(isoDate) {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  return { getForecast };
})();

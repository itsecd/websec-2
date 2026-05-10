import { useEffect, useState } from "react";
import { fetchWeatherForecast, getTodayString } from "../utils/weatherApi";
import WeatherCharts from "./WeatherCharts";

export default function ForecastPopup({ settlement }) {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await fetchWeatherForecast(
          settlement.lat,
          settlement.lon,
          getTodayString()
        );

        if (!cancelled) {
          setForecast(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) setError("Ошибка загрузки прогноза");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [settlement]);

  return (
    <div style={{ width: 360 }}>
      <h3>{settlement.name}</h3>

      {loading && <div>Загрузка...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      {!loading && !error && forecast.length > 0 && (
        <WeatherCharts forecast={forecast} />
      )}
    </div>
  );
}
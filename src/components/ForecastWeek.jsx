import { useEffect, useState } from "react";
import { fetchWeatherForecast } from "../utils/weatherApi";
import WeatherCharts from "./WeatherCharts";

const WEEKDAYS = [
  "ВОСКРЕСЕНЬЕ",
  "ПОНЕДЕЛЬНИК",
  "ВТОРНИК",
  "СРЕДА",
  "ЧЕТВЕРГ",
  "ПЯТНИЦА",
  "СУББОТА",
];

const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function getDateString(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function makeSevenDays() {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    return {
      date,
      key: getDateString(date),
      weekday: WEEKDAYS[date.getDay()],
      dateText: formatDate(date),
    };
  });
}

function getDayInfo(items = []) {
  if (!items.length) {
    return {
      currentTemp: "-",
      minTemp: "-",
      maxTemp: "-",
      wind: "-",
      rain: "-",
    };
  }

  const temps = items
    .map((item) => Number(item.temp_2_cel))
    .filter((value) => Number.isFinite(value));

  const winds = items
    .map((item) => Number(item.wind_speed_10))
    .filter((value) => Number.isFinite(value));

  const rains = items
    .map((item) => Number(item.prate))
    .filter((value) => Number.isFinite(value));

  const middleItem = items[Math.floor(items.length / 2)] || items[0];
  const currentTemp = Math.round(Number(middleItem.temp_2_cel));

  return {
    currentTemp: Number.isFinite(currentTemp) ? currentTemp : "-",
    minTemp: temps.length ? Math.round(Math.min(...temps)) : "-",
    maxTemp: temps.length ? Math.round(Math.max(...temps)) : "-",
    wind: winds.length ? Math.round(Math.max(...winds)) : "-",
    rain: rains.length
      ? Math.round(rains.reduce((sum, value) => sum + value, 0))
      : "-",
  };
}

export default function ForecastWeek({ settlement }) {
  const [daysForecast, setDaysForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!settlement) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const sevenDays = makeSevenDays();

        const result = await Promise.all(
          sevenDays.map(async (day) => {
            const data = await fetchWeatherForecast(
              settlement.lat,
              settlement.lon,
              day.key
            );

            return {
              ...day,
              items: Array.isArray(data) ? data : [],
            };
          })
        );

        if (!cancelled) {
          setDaysForecast(result);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError("Не удалось загрузить прогноз");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [settlement]);

  if (!settlement) {
    return (
      <div style={{ marginTop: 30, textAlign: "center" }}>
        Выберите населённый пункт на карте или через поиск
      </div>
    );
  }

  if (loading) {
    return <div style={{ marginTop: 30 }}>Загрузка прогноза...</div>;
  }

  if (error) {
    return <div style={{ marginTop: 30, color: "red" }}>{error}</div>;
  }

  return (
     <div style={{ marginTop: 35, width: "100%" }}>
      <h2
        style={{
          textAlign: "center",
          fontSize: "36px",
          marginBottom: "25px",
        }}
      >
        {settlement.name}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "24px 60px",
        }}
      >
        {daysForecast.map((day) => {
          const info = getDayInfo(day.items);

          return (
            <div
              key={day.key}
              style={{
                background: "#d9d9d9",
                padding: "18px",
                minHeight: "255px",
                display: "grid",
                gridTemplateColumns: "150px 1fr",
                gap: "24px",
                boxSizing: "border-box",
              }}
            >
              <div>
                <div style={{ fontSize: 20, marginBottom: 14 }}>
                  {day.weekday}
                </div>

                <div style={{ fontSize: 20, marginBottom: 26 }}>
                  {day.dateText}
                </div>

                <div style={{ fontSize: 22, marginBottom: 8 }}>
                  Сейчас
                </div>

                <div
                  style={{
                    fontSize: 50,
                    lineHeight: 1,
                    marginBottom: 10,
                  }}
                >
                  {info.currentTemp}°C
                </div>

                <div style={{ fontSize: 20, marginBottom: 8 }}>
                  от {info.minTemp}°C до {info.maxTemp}°C
                </div>

                <div style={{ fontSize: 20, marginBottom: 22 }}>
                  ветер: {info.wind} м/с
                </div>

                <div style={{ fontSize: 20 }}>
                  осадки: {info.rain} мм
                </div>
              </div>

              <div
                style={{
                  background: "white",
                  minHeight: "220px",
                  padding: "10px",
                  boxSizing: "border-box",
                }}
              >
                {day.items.length > 0 ? (
                  <WeatherCharts forecast={day.items} />
                ) : (
                  <div style={{ padding: 20 }}>
                    Нет данных
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
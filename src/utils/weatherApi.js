export async function fetchWeatherForecast(lat, lon, date) {
  const response = await fetch(
    `http://localhost:3001/api/weather?lat=${lat}&lon=${lon}&date=${date}`
  );

  if (!response.ok) {
    throw new Error("Ошибка загрузки прогноза");
  }

  return response.json();
}

export function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}
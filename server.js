const express = require("express");

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/api/weather", async (req, res) => {
  try {
    const { lat, lon, date, token } = req.query;

    if (!lat || !lon || !date || !token) {
      return res.status(400).json({
        error: "Missing parameters: lat, lon, date, token required"
      });
    }

    const apiUrl = new URL("https://projecteol.ru/api/weather/");
    apiUrl.searchParams.set("lat", lat);
    apiUrl.searchParams.set("lon", lon);
    apiUrl.searchParams.set("date", date);
    apiUrl.searchParams.set("token", token);

    const response = await fetch(apiUrl.toString());

    const text = await response.text();

    try {
      const json = JSON.parse(text);
      res.json(json);
    } catch {
      res.setHeader("Content-Type", "text/plain");
      res.send(text);
    }

  } catch (err) {
    res.status(500).json({
      error: "Proxy error",
      message: err.message
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Proxy server running at http://localhost:${PORT}`);
});
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const TOKEN = VITE_EOLE_TOKEN;

app.get("/api/weather", async (req, res) => {
  const { lat, lon, date } = req.query;

  try {
    const url = `https://projecteol.ru/api/weather/?lat=${lat}&lon=${lon}&date=${date}&token=${TOKEN}`;

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Ошибка загрузки" });
  }
});

app.listen(3001, () => {
  console.log("Server started on http://localhost:3001");
});
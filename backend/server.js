const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const winston = require('winston');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const YANDEX_API_KEY = process.env.YANDEX_API_KEY || '';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/server.log' }),
    new winston.transports.File({ filename: 'logs/errors.log', level: 'error' }),
  ],
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  logger.info(`Установлены заголовки CORS для запроса: ${req.method} ${req.path}`);
  next();
});

app.use((req, res, next) => {
  logger.info(`Входящий запрос: ${req.method} ${req.path} с параметрами: ${JSON.stringify(req.query)}`);
  next();
});

app.get('/api/*', async (req, res) => {
  const endpoint = req.path.replace('/api', '');
  const fullUrl = `https://api.rasp.yandex.net/v3.0${endpoint}`;
  try {
    logger.info(`Перенаправление запроса на: ${fullUrl} с параметрами: ${JSON.stringify(req.query)}`);
    const response = await axios.get(fullUrl, {
      params: {
        apikey: YANDEX_API_KEY,
        ...req.query,
      },
    });
    logger.info(`Успешно получен ответ от ${fullUrl} со статусом: ${response.status}`);
    res.json(response.data);
  } catch (error) {
    logger.error(`Ошибка при перенаправлении запроса на ${fullUrl}: ${error.message}`);
    res.status(500).json({ error: 'Сетевая ошибка', details: error.message });
  }
});

app.use((err, req, res, next) => {
  logger.error(`Необработанная ошибка: ${err.message}`);
  res.status(500).json({ error: 'Ошибка сервера', details: err.message });
});

app.listen(PORT, () => {
  logger.info(`Сервер запущен на порту ${PORT}`);
});
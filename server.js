require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { loadCities } = require('./utils/citiesLoader');
const createApiRouter = require('./routes/api');

const app = express();
const PORT = 3000;

const EOL_API_KEY = process.env.EOL_API_KEY;

if (!EOL_API_KEY) {
    console.error('Нет API ключа в .env');
    process.exit(1);
}

console.log('API ключ загружен');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const cities = loadCities();

app.use('/api', createApiRouter(cities, EOL_API_KEY));

app.listen(PORT, () => {
    console.log(`Сервер: http://localhost:${PORT}`);
});
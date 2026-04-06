const express = require('express');
const router = express.Router();
const WeatherService = require('../services/weatherService');

module.exports = function(cities, apiKey) {
    const weatherService = new WeatherService(apiKey);
    
    router.get('/cities', (req, res) => {
        res.json(cities);
    });
    
    router.get('/cities/search', (req, res) => {
        const query = req.query.q?.toLowerCase() || '';
        if (!query || query.length < 2) return res.json([]);
        
        const filtered = cities
            .filter(city => city.name.toLowerCase().includes(query))
            .slice(0, 20);
        res.json(filtered);
    });
    
    // Прогноз погоды
    router.get('/weather', async (req, res) => {
        const { lat, lon, days = 5 } = req.query;
        
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Не указаны координаты' });
        }
        
        try {
            console.log(`Запрос погоды: lat=${lat}, lon=${lon}`);
            const weatherData = await weatherService.fetchWeather(lat, lon, days);
            console.log(`огода получена (${weatherData.daily.time.length} дней)`);
            res.json(weatherData);
        } catch (error) {
            console.error('Ошибка погоды:', error.message);
            res.json(weatherService.getMockData(days));
        }
    });
    
    return router;
};
const axios = require('axios');

class WeatherService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://projecteol.ru/api/weather/';
    }

    getDateRange(days) {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + parseInt(days) - 1);
        
        const startStr = today.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        return `${startStr},${endStr}`;
    }

    groupByDay(data) {
        const dailyForecast = {};
        
        data.forEach(item => {
            const date = item.dt_forecast.split('T')[0];
            if (!dailyForecast[date]) {
                dailyForecast[date] = {
                    temps: [],
                    winds: [],
                    precipitations: []
                };
            }
            
            let tempCelsius = item.temp_2_cel;
            if (tempCelsius === undefined || tempCelsius === null) {
                tempCelsius = item.temp_2 - 273.15;
            }
            
            dailyForecast[date].temps.push(tempCelsius);
            dailyForecast[date].winds.push(item.wind_speed_10 || 0);
            dailyForecast[date].precipitations.push(item.prate || 0);
        });
        
        return dailyForecast;
    }

    formatResponse(dailyForecast, days) {
        const daysList = Object.keys(dailyForecast).sort().slice(0, parseInt(days));
        
        return {
            daily: {
                time: daysList,
                temperature_2m_max: daysList.map(d => Math.max(...dailyForecast[d].temps)),
                temperature_2m_min: daysList.map(d => Math.min(...dailyForecast[d].temps)),
                precipitation_sum: daysList.map(d => {
                    const sum = dailyForecast[d].precipitations.reduce((a, b) => a + b, 0);
                    return Math.round(sum * 10) / 10;
                }),
                wind_speed_10m_max: daysList.map(d => Math.max(...dailyForecast[d].winds))
            }
        };
    }

    getMockData(days = 5) {
        const times = [];
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            times.push(d.toISOString().split('T')[0]);
        }
        
        return {
            daily: {
                time: times,
                temperature_2m_max: [12, 14, 16, 13, 11],
                temperature_2m_min: [5, 7, 8, 6, 4],
                precipitation_sum: [2.5, 0, 1.2, 3.0, 0],
                wind_speed_10m_max: [15, 12, 18, 14, 10]
            }
        };
    }

    async fetchWeather(lat, lon, days = 5) {
        const dateRange = this.getDateRange(days);
        
        const response = await axios.get(this.baseUrl, {
            params: {
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                date: dateRange,
                token: this.apiKey
            },
            timeout: 15000
        });
        
        const dailyForecast = this.groupByDay(response.data);
        return this.formatResponse(dailyForecast, days);
    }
}

module.exports = WeatherService;
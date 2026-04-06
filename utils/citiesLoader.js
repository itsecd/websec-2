const fs = require('fs');
const path = require('path');

function loadCities() {
    try {
        const citiesPath = path.join(__dirname, '..', 'data', 'cities.json');
        const citiesData = fs.readFileSync(citiesPath, 'utf8');
        const cities = JSON.parse(citiesData);
        console.log(`Загружено ${cities.length} городов`);
        return cities;
    } catch (error) {
        console.error('Ошибка загрузки городов:', error.message);
        return [];
    }
}

module.exports = { loadCities };
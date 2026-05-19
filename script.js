// 1. Глобальные переменные
let map;
let markersLayer;
let citiesData = [];           // массив городов из settlements.json
let currentCityId = null;
let tempChart, windChart, precipChart;

// 2. Функция инициализации карты (вызывается один раз)
function initMap() {
    map = L.map('map').setView([61.524, 105.3188], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB'
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
}

// 3. Размер маркера в зависимости от населения
function getMarkerSize(population) {
    if (population > 2000000) return 14;
    if (population > 1000000) return 11;
    if (population > 500000) return 9;
    return 7;
}

// 4. Добавление маркеров на карту
function addCityMarkers(cities) {
    markersLayer.clearLayers();
    cities.forEach(city => {
        let markerSize = getMarkerSize(city.population || 0);
        let markerIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #0d6efd; width: ${markerSize}px; height: ${markerSize}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
            iconSize: [markerSize, markerSize],
            popupAnchor: [0, -markerSize/2]
        });
        let marker = L.marker([city.lat, city.lon], { icon: markerIcon }).addTo(markersLayer);
        marker.bindPopup(`<strong>${city.name}</strong><br>Население: ${(city.population || 0).toLocaleString()}<br><i>Нажмите для прогноза</i>`);
        marker.on('click', () => {
            $('#modalCityName').text(`Прогноз: ${city.name}`);
            currentCityId = city;
            fetchAndShowWeather(city.lat, city.lon);
            $('#weatherModal').modal('show');
        });
    });
}

// 5. Загрузка погоды через Open-Meteo (без изменений)
function fetchAndShowWeather(lat, lon) {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto&forecast_days=7`;
    $.ajax({
        url: apiUrl,
        type: 'GET',
        dataType: 'json',
        success: function(data) {
            if (!data || !data.daily) {
                console.error('Некорректный ответ API');
                return;
            }
            const labels = data.daily.time.map(date => date.slice(5));
            const tempMax = data.daily.temperature_2m_max;
            const tempMin = data.daily.temperature_2m_min;
            const wind = data.daily.windspeed_10m_max;
            const precip = data.daily.precipitation_sum;
            
            updateTempChart(labels, tempMax, tempMin);
            updateWindChart(labels, wind);
            updatePrecipChart(labels, precip);
            $('#forecastSummary').html(`📅 7 дней • единицы: темп. °C • ветер м/с • осадки мм`);
        },
        error: function(err) {
            console.error('Ошибка запроса погоды:', err);
            $('#forecastSummary').html('❌ Не удалось загрузить прогноз. Проверьте подключение.');
        }
    });
}

// Графики (без изменений)
function updateTempChart(labels, maxTemps, minTemps) {
    if (tempChart) tempChart.destroy();
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    tempChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Макс. температура (°C)', data: maxTemps, borderColor: 'red', backgroundColor: 'rgba(255,99,132,0.1)', tension: 0.2, fill: true },
                { label: 'Мин. температура (°C)', data: minTemps, borderColor: 'blue', backgroundColor: 'rgba(54,162,235,0.1)', tension: 0.2, fill: true }
            ]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
    });
}

function updateWindChart(labels, windData) {
    if (windChart) windChart.destroy();
    const ctx = document.getElementById('windSpeedChart').getContext('2d');
    windChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Макс. ветер (м/с)', data: windData, backgroundColor: 'rgba(75,192,192,0.6)', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function updatePrecipChart(labels, precipData) {
    if (precipChart) precipChart.destroy();
    const ctx = document.getElementById('precipitationChart').getContext('2d');
    precipChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Осадки (мм)', data: precipData, backgroundColor: 'rgba(54,162,235,0.7)', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

// 6. Поиск города через Open-Meteo Geocoding (автодополнение)
let searchTimeout;
$('#citySearchInput').on('input', function() {
    clearTimeout(searchTimeout);
    const query = $(this).val().trim();
    if (query.length < 2) {
        $('#searchSuggestions').hide();
        return;
    }
    searchTimeout = setTimeout(() => {
        $.ajax({
            url: `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=ru&format=json`,
            type: 'GET',
            success: function(resp) {
                if (!resp.results || resp.results.length === 0) {
                    $('#searchSuggestions').hide();
                    return;
                }
                let suggestionsHtml = '';
                resp.results.forEach(loc => {
                    let cityName = loc.name;
                    if (loc.admin1) cityName += `, ${loc.admin1}`;
                    if (loc.country) cityName += `, ${loc.country}`;
                    suggestionsHtml += `<a href="#" class="list-group-item list-group-item-action suggestion-item" data-lat="${loc.latitude}" data-lon="${loc.longitude}" data-name="${loc.name}">${cityName}</a>`;
                });
                $('#searchSuggestions').html(suggestionsHtml).show();
            },
            error: () => $('#searchSuggestions').hide()
        });
    }, 300);
});

// Клик по подсказке поиска (с привязкой к загруженным городам)
$(document).on('click', '.suggestion-item', function(e) {
    e.preventDefault();
    const lat = $(this).data('lat');
    const lon = $(this).data('lon');
    const name = $(this).data('name');
    $('#citySearchInput').val(name);
    $('#searchSuggestions').hide();
    map.setView([lat, lon], 9);
    
    // Ищем ближайший город в загруженном списке citiesData
    let nearestCity = null;
    let minDist = Infinity;
    if (citiesData.length) {
        citiesData.forEach(city => {
            let dist = Math.hypot(city.lat - lat, city.lon - lon);
            if (dist < minDist) {
                minDist = dist;
                nearestCity = city;
            }
        });
    }
    if (nearestCity && minDist < 1.5) {
        fetchAndShowWeather(nearestCity.lat, nearestCity.lon);
        $('#modalCityName').text(`Прогноз: ${nearestCity.name}`);
        $('#weatherModal').modal('show');
    } else {
        // Город не из списка, но погоду покажем
        fetchAndShowWeather(lat, lon);
        $('#modalCityName').text(`Прогноз: ${name}`);
        $('#weatherModal').modal('show');
    }
});

// Скрытие подсказок при клике вне поля
$(document).click(function(e) {
    if (!$(e.target).closest('.search-box').length) {
        $('#searchSuggestions').hide();
    }
});

// 7. Загрузка городов из JSON и инициализация приложения
function loadCitiesAndStart() {
    $.ajax({
        url: 'settlements.json',
        dataType: 'json',
        success: function(data) {
            if (Array.isArray(data) && data.length) {
                citiesData = data;
                console.log(`Загружено ${citiesData.length} городов из settlements.json`);
                addCityMarkers(citiesData);
            } else {
                console.warn('Файл settlements.json пуст или имеет неверный формат');
                $('#forecastSummary').html('⚠️ Не удалось загрузить список городов. Маркеры отсутствуют.');
            }
        },
        error: function(xhr, status, error) {
            console.error('Ошибка загрузки settlements.json:', error);
            $('#forecastSummary').html('❌ Ошибка загрузки списка городов. Маркеры не добавлены.');
        }
    });
}

// 8. Старт приложения
$(document).ready(function() {
    initMap();                 // создаём карту (без маркеров)
    loadCitiesAndStart();     // загружаем JSON и добавляем маркеры
});
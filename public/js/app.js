let map;
let markers = [];

$(document).ready(function() {
    map = L.map('map').setView([55.7558, 37.6173], 5);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    loadCities();
    
    $('#citySearch').on('input', function() {
        const query = $(this).val();
        if (query.length >= 2) {
            searchCities(query);
        } else {
            $('#searchResults').hide();
        }
    });
    
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.search-box').length) {
            $('#searchResults').hide();
        }
    });
    
    $('.close').on('click', function() {
        $('#weatherModal').hide();
    });
    
    $(window).on('click', function(e) {
        if ($(e.target).is('#weatherModal')) {
            $('#weatherModal').hide();
        }
    });
});

function loadCities() {
    $.ajax({
        url: '/api/cities',
        method: 'GET',
        success: function(cities) {
            console.log('✅ Загружено городов:', cities.length);
            addMarkersToMap(cities);
        },
        error: function(err) {
            console.error('❌ Ошибка загрузки городов:', err);
        }
    });
}

function addMarkersToMap(cities) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    cities.forEach(city => {
        const marker = L.marker([city.lat, city.lon])
            .bindPopup(`<b>${city.name}</b><br>Население: ${city.population.toLocaleString()}<br><i>Кликни для прогноза</i>`)
            .on('click', function() {
                showWeather(city);
            });
        marker.addTo(map);
        markers.push(marker);
    });
    
    console.log('Добавлено маркеров:', markers.length);
}

function searchCities(query) {
    $.ajax({
        url: `/api/cities/search?q=${encodeURIComponent(query)}`,
        method: 'GET',
        success: function(cities) {
            showSearchResults(cities);
        },
        error: function(err) {
            console.error('Ошибка поиска:', err);
        }
    });
}

function showSearchResults(cities) {
    const $results = $('#searchResults');
    $results.empty();
    
    if (cities.length === 0) {
        $results.hide();
        return;
    }
    
    cities.forEach(city => {
        $results.append(`<div data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}">${city.name} (${city.population.toLocaleString()} чел.)</div>`);
    });
    
    $results.show();
    
    $results.find('div').on('click', function() {
        const lat = parseFloat($(this).data('lat'));
        const lon = parseFloat($(this).data('lon'));
        const name = $(this).data('name');
        
        map.setView([lat, lon], 12);
        
        const marker = markers.find(m => {
            const pos = m.getLatLng();
            return Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lon) < 0.0001;
        });
        
        if (marker) {
            marker.openPopup();
            const city = { name, lat, lon };
            showWeather(city);
        }
        
        $('#citySearch').val(name);
        $('#searchResults').hide();
    });
}
function showWeather(city) {
    $('#modalCityName').text(city.name);
    $('#weatherContent').html('<div class="loader">🌍 Загрузка прогноза...<br><small>Запрос к Project Eol API</small></div>');
    $('#chartsContainer').hide();
    $('#weatherModal').show();
    
    $.ajax({
        url: `/api/weather?lat=${city.lat}&lon=${city.lon}&days=5`,
        method: 'GET',
        timeout: 15000,
        success: function(data) {
            console.log('Погода получена:', data);
            
            if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
                $('#weatherContent').html(`
                    <p style="color:red">Нет данных о погоде</p>
                    <p>Попробуйте другой город</p>
                `);
                $('#chartsContainer').hide();
                return;
            }
            
            renderWeather(data, city);
        },
        error: function(err) {
            console.error('Ошибка:', err);
            let errorMsg = 'Не удалось загрузить прогноз';
            if (err.status === 504 || err.status === 0) {
                errorMsg += '<br>Таймаут соединения. API может быть недоступен.';
            }
            $('#weatherContent').html(`
                <p style="color:red">${errorMsg}</p>
                <p>Проверь соединение или попробуй другой город</p>
                <p><small>HTTP статус: ${err.status || 'неизвестно'}</small></p>
            `);
            $('#chartsContainer').hide();
        }
    });
}

let tempChart = null;
let precipChart = null;
let windChart = null;

function renderWeather(data, city) {
    const daily = data.daily;
    const days = daily.time.length;
    
    const dates = daily.time.map(d => {
        const date = new Date(d);
        return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
    });
    
    const tempMax = daily.temperature_2m_max;
    const tempMin = daily.temperature_2m_min;
    const precip = daily.precipitation_sum;
    const wind = daily.wind_speed_10m_max;
    
    let html = `
        <div class="weather-info">
            <p><strong>📍 ${city.name}</strong></p>
            <hr>
            <div class="forecast-list">
    `;
    
    for (let i = 0; i < days; i++) {
        html += `
            <div class="forecast-day">
                <div class="day-name">${dates[i]}</div>
                <div class="temp">🌡️ ${tempMin[i]}°...${tempMax[i]}°</div>
                <div class="precip">💧 ${precip[i]} мм</div>
                <div class="wind">💨 ${wind[i]} м/с</div>
            </div>
        `;
    }
    
    html += `</div><hr><p><small>Графики ниже</small></p></div>`;
    
    $('#weatherContent').html(html);
    
    $('#chartsContainer').show();
    
    if (tempChart) tempChart.destroy();
    if (precipChart) precipChart.destroy();
    if (windChart) windChart.destroy();
    
    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(ctxTemp, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Макс. температура (°C)',
                    data: tempMax,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Мин. температура (°C)',
                    data: tempMin,
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { title: { display: true, text: 'Температура (°C)' } }
            }
        }
    });
    
    const ctxPrecip = document.getElementById('precipChart').getContext('2d');
    precipChart = new Chart(ctxPrecip, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Осадки (мм)',
                data: precip,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { title: { display: true, text: 'Осадки (мм)' }, beginAtZero: true }
            }
        }
    });
    
    const ctxWind = document.getElementById('windChart').getContext('2d');
    windChart = new Chart(ctxWind, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Скорость ветра (м/с)',
                data: wind,
                borderColor: 'rgb(153, 102, 255)',
                backgroundColor: 'rgba(153, 102, 255, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { title: { display: true, text: 'Ветер (м/с)' }, beginAtZero: true }
            }
        }
    });
}
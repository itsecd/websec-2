const map = L.map('map').setView([55.75, 50.0], 4); 
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let tempChartInstance = null;
let mixedChartInstance = null;

// Массив для хранения маркеров, чтобы по ним работал поиск
const markers = [];

// Функция для загрузки наших городов
async function loadCities() {
    try {
        // Загружаем файл с городами
        const response = await fetch('cities.json');
        const cities = await response.json();
        
        // Перебираем города и ставим точки на карту
        cities.forEach(city => {
            const marker = L.marker([city.lat, city.lon]).addTo(map);
            marker.bindTooltip(city.name);
            marker.on('click', () => {
                map.flyTo([city.lat, city.lon], 8);
                fetchWeather(city);
            });
            markers.push({ ...city, marker });
        });
    } catch (error) {
        console.error("Ошибка при загрузке городов:", error);
        alert("Не удалось загрузить cities.json. Проверьте консоль.");
    }
}

// Запускаем загрузку сразу при открытии страницы
loadCities();

function searchCity() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!query) return;

    const found = markers.find(c => c.name.toLowerCase().includes(query));
    if (found) {
        map.flyTo([found.lat, found.lon], 8);
        found.marker.openTooltip();
        fetchWeather(found);
    } else {
        alert('Город не найден. Попробуйте другой из списка крупных городов.');
    }
}

document.getElementById('searchBtn').addEventListener('click', searchCity);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchCity();
});

async function fetchWeather(city) {
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('weatherContent').classList.add('hidden');
    document.getElementById('loader').classList.remove('hidden');

    document.getElementById('cityName').textContent = city.name;
    document.getElementById('cityCoords').textContent = `Широта: ${city.lat.toFixed(4)}, Долгота: ${city.lon.toFixed(4)}`;

    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&hourly=temperature_2m,precipitation,wind_speed_10m&current_weather=true&timezone=auto`);
        const data = await response.json();

        document.getElementById('currentTemp').textContent = `${data.current_weather.temperature} °C`;
        document.getElementById('currentWind').textContent = `${(data.current_weather.windspeed * 1000 / 3600).toFixed(1)} м/с`;
        document.getElementById('currentPrecip').textContent = `${data.hourly.precipitation[0]} мм`;

        const labels = [];
        const temps = [];
        const precip = [];
        const wind = [];

        for (let i = 0; i < 120; i += 4) {
            const date = new Date(data.hourly.time[i]);
            labels.push(`${date.getDate()}.${date.getMonth() + 1} ${date.getHours()}:00`);
            temps.push(data.hourly.temperature_2m[i]);
            precip.push(data.hourly.precipitation[i]);
            wind.push(data.hourly.wind_speed_10m[i] * 1000 / 3600); 
        }

        renderCharts(labels, temps, precip, wind);

        document.getElementById('loader').classList.add('hidden');
        document.getElementById('weatherContent').classList.remove('hidden');
        
    } catch (error) {
        console.error("Ошибка при получении данных:", error);
        document.getElementById('loader').classList.add('hidden');
        alert("Не удалось загрузить данные о погоде. Проверьте подключение к сети.");
    }
}

function renderCharts(labels, temps, precip, wind) {
    if (tempChartInstance) tempChartInstance.destroy();
    if (mixedChartInstance) mixedChartInstance.destroy();

    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    tempChartInstance = new Chart(ctxTemp, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Температура (°C)',
                data: temps,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { borderDash: [5, 5] } },
                x: { ticks: { maxTicksLimit: 8 } }
            }
        }
    });

    const ctxMixed = document.getElementById('mixedChart').getContext('2d');
    mixedChartInstance = new Chart(ctxMixed, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Осадки (мм)',
                    data: precip,
                    backgroundColor: 'rgba(14, 165, 233, 0.6)',
                    yAxisID: 'y'
                },
                {
                    label: 'Ветер (м/с)',
                    data: wind,
                    type: 'line',
                    borderColor: 'rgb(100, 116, 139)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { ticks: { maxTicksLimit: 8 } },
                y: {
                    type: 'linear', display: true, position: 'left',
                    title: { display: true, text: 'Осадки (мм)' }
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    title: { display: true, text: 'Ветер (м/с)' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

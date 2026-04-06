const map = L.map('map', { attributionControl: false }).setView([55.75, 37.61], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors | Погода: <a href="https://open-meteo.com/">Open-Meteo</a>'
}).addTo(map);

let chartInstance = null;
const citiesData = new Map();
const markersMap = new Map();
let allCities = [];
let currentIndex = 0;
const initialCount = 1000;

async function init() {
    try {
        const response = await fetch('cities.json');
        allCities = await response.json();
        const dataList = document.getElementById('city-list');

        for (let i = 0; i < Math.min(initialCount, allCities.length); i++) {
            addCity(allCities[i], dataList);
        }
        currentIndex = Math.min(initialCount, allCities.length);
    } catch (error) {
        console.error("Ошибка загрузки датасета городов:", error);
    }
}

function addCity(city, dataList) {
    const cityName = city.settlement || city.region;
    citiesData.set(cityName, city);

    const option = document.createElement('option');
    option.value = cityName;
    dataList.appendChild(option);

    const marker = L.circleMarker([city.latitude_dadata, city.longitude_dadata], {
        radius: 6, color: '#005b9f', weight: 1, fillOpacity: 0.7
    }).addTo(map);

    marker.on('click', () => handleMarkerClick(city, marker));
    markersMap.set(cityName, marker);
}

function removeCity(cityName, dataList) {
    if (markersMap.has(cityName)) {
        const marker = markersMap.get(cityName);
        map.removeLayer(marker);
        markersMap.delete(cityName);
        citiesData.delete(cityName);

        const options = dataList.querySelectorAll('option');
        options.forEach(option => {
            if (option.value === cityName) {
                dataList.removeChild(option);
            }
        });
    }
}

document.getElementById('search').addEventListener('change', (e) => {
    const cityName = e.target.value;
    if (citiesData.has(cityName) && markersMap.has(cityName)) {
        const city = citiesData.get(cityName);
        const marker = markersMap.get(cityName);

        map.flyTo([city.latitude_dadata, city.longitude_dadata], 10, { duration: 1.5 });
        handleMarkerClick(city, marker);
    }
});

function handleMarkerClick(city, marker) {
    const cityName = city.settlement || city.region;
    const popupHtml = `
        <div style="font-weight:bold; margin-bottom: 8px; font-size: 16px;">${cityName}</div>
        <div class="chart-container">
            <canvas id="weatherChart"></canvas>
        </div>
    `;

    marker.bindPopup(popupHtml).openPopup();

    map.once('popupopen', () => {
        fetchWeatherData(city.latitude_dadata, city.longitude_dadata, city);
    });
}

async function fetchWeatherData(lat, lon, city) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,windspeed_10m&timezone=auto&forecast_days=3`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        renderChart(data);
    } catch (error) {
        console.error("Ошибка получения прогноза:", error);
        const cityName = city.settlement || city.region;
        removeCity(cityName, document.getElementById('city-list'));
        if (currentIndex < allCities.length) {
            addCity(allCities[currentIndex], document.getElementById('city-list'));
            currentIndex++;
        }
        const canvasContainer = document.querySelector('.chart-container');
        if (canvasContainer) {
            canvasContainer.innerHTML = '<div style="color:red; padding:20px;">Не удалось загрузить данные о погоде. Город заменен.</div>';
        }
    }
}

function renderChart(apiData) {
    const canvas = document.getElementById('weatherChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }

    const times = apiData.hourly.time.map(t => {
        const d = new Date(t);
        return `${d.getDate()}.${d.getMonth()+1} ${d.getHours()}:00`;
    });
    const temps = apiData.hourly.temperature_2m;
    const precip = apiData.hourly.precipitation;
    const wind = apiData.hourly.windspeed_10m;

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: times,
            datasets: [
                {
                    label: 'Температура (°C)',
                    data: temps,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    yAxisID: 'y',
                    tension: 0.4
                },
                {
                    label: 'Ветер (м/с)',
                    data: wind,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderDash: [5, 5],
                    yAxisID: 'y1',
                    tension: 0.4
                },
                {
                    label: 'Осадки (мм)',
                    data: precip,
                    type: 'bar',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { ticks: { maxTicksLimit: 12 } },
                y: {
                    type: 'linear', display: true, position: 'left',
                    title: { display: true, text: 'Температура' }
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    title: { display: true, text: 'Осадки / Ветер' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

init();
ymaps.ready(init);
let myMap;
let currentUserPlacemark = null;
let weatherChart = null;
function init() {
    myMap = new ymaps.Map('map', {
        center: [55.75, 37.61],
        zoom: 5,
        controls: ['zoomControl', 'typeSelector', 'searchControl']
    });
    const searchControl = myMap.controls.get('searchControl');
    searchControl.events.add('resultselect', function (e) {
        const index = e.get('index');
        searchControl.getResult(index).then(function (res) {
            const coords = res.geometry.getCoordinates();
            const cName = res.properties.get('name');
            if (currentUserPlacemark) {
                myMap.geoObjects.remove(currentUserPlacemark);
                currentUserPlacemark = null;
            }
            loadWeather(coords[0], coords[1], cName);
        });
    });
    document.getElementById('close-carousel').addEventListener('click', () => {
        document.getElementById('weather-panel').classList.add('hidden');
    });
    async function loadWeather(lat, lon, cityName = '') {
        const panel = document.getElementById('weather-panel');
        const carousel = document.getElementById('weather-carousel');
        const title = document.getElementById('city-title');
        panel.classList.remove('hidden');
        title.innerText = cityName ? `Прогноз: ${cityName}` : `Прогноз: Загрузка...`;
        carousel.innerHTML = '<div style="padding: 20px;">Получение данных...</div>';
        try {
            const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
            const data = await response.json();
            if (response.ok && !data.error) {
                if (!cityName) {
                    ymaps.geocode([lat, lon]).then(function (res) {
                        const firstGeoObject = res.geoObjects.get(0);
                        const cName = firstGeoObject ? firstGeoObject.getLocalities().join(', ') || firstGeoObject.getAdministrativeAreas().join(', ') : 'Неизвестная локация';
                        title.innerText = `Погода: ${cName}`;
                    });
                }
                renderWeatherCarousel(data);
            } else {
                carousel.innerHTML = `<div style="padding: 20px; color: red;">Ошибка: ${data.error || 'Не удалось получить данные'}</div>`;
            }
        } catch (err) {
            carousel.innerHTML = `<div style="padding: 20px; color: red;">Ошибка сети: ${err.message}</div>`;
        }
    }
    console.log('Попытка определить местоположение через ipapi.co...');
    fetch('https://ipapi.co/json/')
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.reason || 'Ошибка API');
            const userCoordinates = [data.latitude, data.longitude];
            const userCityName = data.city || data.region || 'Ваш город';
            myMap.setCenter(userCoordinates, 10, {
                checkZoomRange: true,
                duration: 1000
            });
            loadWeather(data.latitude, data.longitude, userCityName);
        })
        .catch(function (err) {
            console.error('Ошибка геолокации по IP:', err);
            ymaps.geolocation.get({ provider: 'browser' }).then(result => {
                const browserCoords = result.geoObjects.get(0).geometry.getCoordinates();
                const browserCity = result.geoObjects.get(0).properties.get('name');
                myMap.setCenter(browserCoords, 10, { duration: 1000 });
                loadWeather(browserCoords[0], browserCoords[1], browserCity);
            }).catch(e => console.error('Браузерная геолокация тоже не удалась', e));
        });
    myMap.events.add('click', function (e) {
        const coords = e.get('coords');
        if (currentUserPlacemark) {
            myMap.geoObjects.remove(currentUserPlacemark);
        }
        currentUserPlacemark = new ymaps.Placemark(coords, {}, { preset: 'islands#redDotIcon' });
        myMap.geoObjects.add(currentUserPlacemark);
        loadWeather(coords[0], coords[1], '');
    });
    document.getElementById('toggle-temp').addEventListener('change', updateChartVisibility);
    document.getElementById('toggle-wind').addEventListener('change', updateChartVisibility);
    document.getElementById('toggle-precip').addEventListener('change', updateChartVisibility);
    Papa.parse('/static/top_1000_cities.csv', {
        download: true,
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        complete: function(results) {
            const data = results.data;
            const objectManager = new ymaps.ObjectManager({
                clusterize: true,
                gridSize: 32,
                clusterDisableClickZoom: false
            });
            myMap.geoObjects.add(objectManager);
            const features = [];
            data.forEach((row, i) => {
                const lat = parseFloat(row.latitude_dadata);
                const lon = parseFloat(row.longitude_dadata);
                if (isNaN(lat) || isNaN(lon)) return;
                let cityName = row.settlement || row.object_name || 'Неизвестно';
                let pop = row.population || '?';
                pop = parseInt(pop).toLocaleString('ru-RU');
                features.push({
                    type: 'Feature',
                    id: i,
                    geometry: {
                        type: 'Point',
                        coordinates: [lat, lon]
                    },
                    properties: {
                        balloonContentHeader: cityName,
                        balloonContentBody: `Население: ${pop} чел.`,
                        hintContent: cityName
                    },
                    options: {
                        preset: 'islands#blueCircleDotIcon'
                    }
                });
            });
            objectManager.add({
                type: 'FeatureCollection',
                features: features
            });
            objectManager.objects.events.add('click', function (e) {
                const objectId = e.get('objectId');
                const obj = objectManager.objects.getById(objectId);
                if (!obj) return;
                const coords = obj.geometry.coordinates;
                const cName = obj.properties.hintContent;
                if (currentUserPlacemark) {
                    myMap.geoObjects.remove(currentUserPlacemark);
                    currentUserPlacemark = null;
                }
                objectManager.objects.balloon.close();
                loadWeather(coords[0], coords[1], cName);
            });
        }
    });
}
function renderWeatherCarousel(data) {
    const carousel = document.getElementById('weather-carousel');
    carousel.innerHTML = ''; 
    const dailyData = {};
    data.forEach(item => {
        const dateObj = new Date(item.dt_forecast);
        const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); 
        if (!dailyData[dateStr]) {
            dailyData[dateStr] = { 
                temps: [], wind: [], precip: [], conditions: [], 
                hourlyLabels: [], hourlyTemps: [], hourlyWind: [], hourlyPrecip: [] 
            };
        }
        dailyData[dateStr].temps.push(item.temp_2_cel);
        dailyData[dateStr].wind.push(item.wind_speed_10);
        dailyData[dateStr].precip.push(item.prate || 0);
        dailyData[dateStr].conditions.push(item.weather_condition);
        const timeStr = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        dailyData[dateStr].hourlyLabels.push(timeStr);
        dailyData[dateStr].hourlyTemps.push(item.temp_2_cel);
        dailyData[dateStr].hourlyWind.push(item.wind_speed_10);
        dailyData[dateStr].hourlyPrecip.push(item.prate || 0);
    });
    const iconMap = {
        0: 'Sunny.png', 
        1: 'Partly_cloudy.png', 
        2: 'Partly_cloudy.png', 
        3: 'Fog.png', 
        4: 'Light_rain.png', 
        5: 'Light_rain.png', 
        6: 'Moderate_rain.png', 
        7: 'Heavy_rain.png', 
        8: 'Thunderstorm.png', 
        10: 'Snowstorm.png',
        11: 'Hail.png', 
        12: 'Hail.png', 
        13: 'Windy.png', 
        14: 'Heat.png', 
        15: 'Heat.png',
        16: 'Heat.png', 
        17: 'Windy.png', 
        18: 'Windy.png', 
        19: 'Cloudy.png', 
        20: 'Cloudy.png',
        21: 'Snow.png', 
        22: 'Snow.png', 
        23: 'Snowstorm.png', 
        99: 'Cloudy.png'
    };
    const textMap = {
        0: 'Ясно', 1: 'Малооблачно', 2: 'Перем. обл.', 3: 'Туман', 4: 'Морось', 
        5: 'Неб. дождь', 6: 'Дождь', 7: 'Ливень', 8: 'Гроза', 10: 'Метель',
        11: 'Лед. дождь', 12: 'Град', 13: 'Пыль', 14: 'Жара', 15: 'Душно',
        16: 'Сил. жара', 17: 'Сил. ветер', 18: 'Ураган', 19: 'Пасмурно', 20: 'Облачно',
        21: 'Сл. снег', 22: 'Снег', 23: 'Снегопад', 99: 'Разное'
    };
    Object.keys(dailyData).forEach(date => {
        const dayInfo = dailyData[date];
        const maxTemp = Math.max(...dayInfo.temps).toFixed(0);
        const minTemp = Math.min(...dayInfo.temps).toFixed(0);
        const maxWind = Math.max(...dayInfo.wind).toFixed(1);
        const sumPrecip = dayInfo.precip.reduce((a, b) => a + b, 0).toFixed(1);
        const counts = {};
        let topCode = dayInfo.conditions[0] || 0;
        let pMax = 0;
        for (let c of dayInfo.conditions) {
            counts[c] = (counts[c] || 0) + 1;
            if (counts[c] > pMax) { pMax = counts[c]; topCode = c; }
        }
        const iconFile = iconMap[topCode] || 'Cloudy.png';
        const condText = textMap[topCode] || 'Облачно';
        const cardHtml = `
            <div class="weather-card" data-date="${date}">
                <div class="weather-date">${date}</div>
                <img class="weather-icon" src="/static/icons/${iconFile}" alt="${condText}" title="${condText}">
                <div class="weather-temp">
                    ${maxTemp}° <span>/ ${minTemp}°</span>
                </div>
                <div class="weather-desc">${condText}</div>
                <div class="weather-details">
                    Вет: ${maxWind} м/с<br>
                    Ос: ${sumPrecip} мм
                </div>
            </div>
        `;
        carousel.innerHTML += cardHtml;
    });
    const cards = carousel.querySelectorAll('.weather-card');
    cards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            cards.forEach(c => c.style.border = '1px solid rgba(255, 255, 255, 0.8)');
            card.style.border = '2px solid #3498db';
            const clickedDate = card.getAttribute('data-date');
            renderHourlyChart(clickedDate, dailyData[clickedDate]);
        });
    });
    const firstDate = Object.keys(dailyData)[0];
    if (firstDate) {
        if (cards[0]) cards[0].style.border = '2px solid #3498db';
        renderHourlyChart(firstDate, dailyData[firstDate]);
    }
}
function renderHourlyChart(date, dayInfo) {
    if (weatherChart) {
        weatherChart.destroy();
    }
    const ctx = document.getElementById('weather-chart').getContext('2d');
    weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dayInfo.hourlyLabels,
            datasets: [
                {
                    label: `Температура (°C)`,
                    data: dayInfo.hourlyTemps,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: `Ветер (м/с)`,
                    data: dayInfo.hourlyWind,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'yWind',
                    hidden: true
                },
                {
                    type: 'bar',
                    label: `Осадки (мм)`,
                    data: dayInfo.hourlyPrecip,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    yAxisID: 'yPrecip',
                    hidden: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `Погода по часам — ${date}`,
                    font: { size: 14 }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Темп. (°C)'
                    }
                },
                yWind: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Ветер (м/с)'
                    },
                    grid: {
                        drawOnChartArea: false, 
                    },
                    min: 0
                },
                yPrecip: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Осадки (мм)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    min: 0
                }
            }
        }
    });
    updateChartVisibility();
}
function updateChartVisibility() {
    if (!weatherChart) return;
    const showTemp = document.getElementById('toggle-temp').checked;
    const showWind = document.getElementById('toggle-wind').checked;
    const showPrecip = document.getElementById('toggle-precip').checked;
    weatherChart.setDatasetVisibility(0, showTemp);
    weatherChart.setDatasetVisibility(1, showWind);
    weatherChart.setDatasetVisibility(2, showPrecip);
    weatherChart.options.scales.y.display = showTemp;
    weatherChart.options.scales.yWind.display = showWind;
    weatherChart.options.scales.yPrecip.display = showPrecip;
    weatherChart.update();
}
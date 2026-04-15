
window.MapModule = (() => {

  let map = null;
  let markersLayer = null;
  let activeMarker = null;
  let onCitySelectCb = null;

  const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const TILE_ATT = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a> · Погода: <a href="https://open-meteo.com">Open-Meteo</a> CC BY 4.0 · Города: <a href="https://tochno.st/datasets/allsettlements">Если быть точным</a> CC BY 4.0';

  function init(containerId, onCitySelect) {
    onCitySelectCb = onCitySelect;

    map = L.map(containerId, {
      center: [61.5, 105.0],
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATT,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);


    const renderer = L.canvas({ padding: 0.5 });
    markersLayer = L.layerGroup().addTo(map);

    renderCities(renderer);

    return map;
  }

  function renderCities(renderer) {
    const cities = window.CITIES;

    cities.forEach((city) => {
      const icon = L.divIcon({
        className: 'city-dot',
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });

      const marker = L.marker([city.lat, city.lon], { icon, title: city.name });

      marker.on('click', () => {
        selectMarker(marker, city);
      });

      marker.cityData = city;
      markersLayer.addLayer(marker);
    });
  }

  function selectMarker(marker, city) {
    if (activeMarker) {
      const el = activeMarker.getElement();
      if (el) el.classList.remove('active');
    }

    activeMarker = marker;
    const el = marker.getElement();
    if (el) el.classList.add('active');

    const pop = L.popup({ closeButton: true, autoPan: true })
      .setLatLng([city.lat, city.lon])
      .setContent(buildPopupHTML(city))
      .openOn(map);

    pop.getElement()?.querySelector('.popup-btn')
      ?.addEventListener('click', () => {
        map.closePopup(pop);
        if (onCitySelectCb) onCitySelectCb(city);
      });

    if (onCitySelectCb) onCitySelectCb(city);
  }

  function buildPopupHTML(city) {
    const pop = `${city.pop > 1000000
      ? (city.pop / 1000000).toFixed(1) + ' млн'
      : (city.pop / 1000).toFixed(0) + ' тыс.'}`;
    return `
      <div class="popup-name">${city.name}</div>
      <div class="popup-meta">${city.region}</div>
      <div class="popup-meta" style="margin-top:4px">👥 ${pop} чел.</div>
      <button class="popup-btn">ПРОГНОЗ ПОГОДЫ →</button>
    `;
  }

  function flyTo(city) {
    map.flyTo([city.lat, city.lon], 8, { duration: 1.2 });

    markersLayer.eachLayer((layer) => {
      if (layer.cityData && layer.cityData.name === city.name
          && layer.cityData.lat === city.lat) {
        selectMarker(layer, city);
      }
    });
  }

  return { init, flyTo };
})();

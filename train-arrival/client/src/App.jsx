import { useCallback, useState } from "react";
import "./App.css";
import MapView from "./MapView";
import {
  getNearbyStations,
  getStationSchedule,
  searchStations,
  searchRoutes,
} from "./api";

function App() {
  const [nearby, setNearby] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [marker, setMarker] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [mode, setMode] = useState("station");
  const [routeFrom, setRouteFrom] = useState(null);
  const [routeTo, setRouteTo] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(true);

  const handleSearchChange = useCallback(async (event) => {
    const value = event.target.value;
    setSearchQuery(value);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setError("");
      const stations = await searchStations(trimmed);
      setSearchResults(stations);
    } catch {
      setError("Не удалось выполнить поиск станции");
    }
  }, []);

  function setStationMarker(station) {
    if (station.latitude != null && station.longitude != null) {
      setMarker({ lat: station.latitude, lng: station.longitude });
      return;
    }

    if (station.lat != null && station.lng != null) {
      setMarker({ lat: station.lat, lng: station.lng });
    }
  }

  function handleSelectStation(station) {
    if (mode === "route") {
      if (!routeFrom) {
        setRouteFrom(station);
      } else if (!routeTo) {
        setRouteTo(station);
      } else {
        setRouteFrom(station);
        setRouteTo(null);
      }
      setRoutes(null);
      setSelectedStation(station);
    } else {
      setSelectedStation(station);
      setSchedule(null);
    }

    setStationMarker(station);
    setSheetOpen(true);
  }

  function handleSelectFromSearch(station) {
    handleSelectStation(station);
  }

  function handleSelectNearby(station) {
    handleSelectStation(station);
  }

  const handleMapClick = useCallback(
    async ({ lat, lng }) => {
      try {
        setError("");
        if (mode === "station") {
          setSchedule(null);
          setSelectedStation(null);
        }
        setMarker({ lat, lng });
        const data = await getNearbyStations(lat, lng);
        setNearby(data);
        setSheetOpen(true);
      } catch {
        setError("Не удалось получить ближайшие станции");
      }
    },
    [mode],
  );

  async function loadSchedule() {
    if (!selectedStation) {
      setError("Сначала выберите станцию");
      return;
    }

    try {
      setError("");
      const data = await getStationSchedule(selectedStation.code, date);
      setSchedule(data);
      setSheetOpen(true);
    } catch {
      setError("Не удалось загрузить расписание станции");
    }
  }

  async function loadRoutes() {
    if (!routeFrom || !routeTo) {
      setError("Выберите станции отправления и прибытия");
      return;
    }

    try {
      setError("");
      const data = await searchRoutes(
        routeFrom.code,
        routeTo.code,
        date,
        false,
      );
      setRoutes(data);
      setSheetOpen(true);
    } catch {
      setError("Не удалось загрузить маршруты");
    }
  }

  const markers = [];

  if (mode === "route") {
    if (
      routeFrom &&
      routeFrom.latitude != null &&
      routeFrom.longitude != null
    ) {
      markers.push({ lat: routeFrom.latitude, lng: routeFrom.longitude });
    } else if (routeFrom && routeFrom.lat != null && routeFrom.lng != null) {
      markers.push({ lat: routeFrom.lat, lng: routeFrom.lng });
    }

    if (routeTo && routeTo.latitude != null && routeTo.longitude != null) {
      markers.push({ lat: routeTo.latitude, lng: routeTo.longitude });
    } else if (routeTo && routeTo.lat != null && routeTo.lng != null) {
      markers.push({ lat: routeTo.lat, lng: routeTo.lng });
    }
  }

  if (!markers.length && marker) {
    markers.push(marker);
  }

  function renderSearchResults() {
    if (!searchQuery.trim()) {
      return null;
    }

    if (!searchResults.length) {
      return <div className="empty small">Ничего не найдено</div>;
    }

    return searchResults.map((st) => (
      <button
        key={`search-${st.code}`}
        className={`list-item ${selectedStation?.code === st.code ? "active" : ""}`}
        onClick={() => handleSelectFromSearch(st)}
      >
        <span className="list-title">{st.title}</span>
        <span className="list-subtitle">
          {st.settlementTitle || st.regionTitle || st.countryTitle}
        </span>
      </button>
    ));
  }

  function renderNearbyStations() {
    if (!nearby.length) {
      return (
        <div className="empty small">
          Нажмите по карте, чтобы увидеть ближайшие станции
        </div>
      );
    }

    return nearby.map((st) => (
      <button
        key={st.code}
        className={`list-item ${selectedStation?.code === st.code ? "active" : ""}`}
        onClick={() => handleSelectNearby(st)}
      >
        <span className="list-title">{st.title}</span>
        <span className="list-subtitle">
          {st.distance ? `${st.distance.toFixed(2)} км` : "Станция рядом"}
        </span>
      </button>
    ));
  }

  function renderStationContent() {
    if (!schedule) {
      return (
        <div className="sheet-block">
          <div className="sheet-header">
            <h2>Расписание по станции</h2>
            <p>
              Выберите станцию на карте или через поиск, затем откройте расписание
            </p>
          </div>

          {selectedStation ? (
            <div className="selected-box">
              <div className="selected-title">{selectedStation.title}</div>
              <div className="selected-subtitle">{selectedStation.code}</div>
            </div>
          ) : (
            <div className="empty">Станция пока не выбрана</div>
          )}

          <div className="result-section">
            <h3>Ближайшие станции</h3>
            <div className="list list-nearby">{renderNearbyStations()}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="sheet-block">
        <div className="sheet-header">
          <h2>Расписание по станции</h2>
          <p>{schedule.station?.title || selectedStation?.title}</p>
        </div>

        <div className="schedule-scroll">
          <div className="result-section">
            <h3>Отправление</h3>
            <div className="cards">
              {schedule.departure?.length ? (
                schedule.departure.map((item, index) => (
                  <article
                    className="card"
                    key={`dep-${item.uid || index}`}
                  >
                    <h3>{item.title || "Электричка"}</h3>
                    <p><strong>Номер:</strong> {item.number || "—"}</p>
                    <p><strong>Направление:</strong> {item.direction || "—"}</p>
                    <p><strong>Отправление:</strong> {item.departure || "—"}</p>
                    <p><strong>Прибытие:</strong> {item.arrival || "—"}</p>
                    <p><strong>Платформа:</strong> {item.platform || "—"}</p>
                    <p><strong>Дни:</strong> {item.days || "—"}</p>
                    <p><strong>Перевозчик:</strong> {item.carrier || "—"}</p>
                  </article>
                ))
              ) : (
                <div className="empty">Нет отправлений на выбранную дату</div>
              )}
            </div>
          </div>

          <div className="result-section">
            <h3>Прибытие</h3>
            <div className="cards">
              {schedule.arrival?.length ? (
                schedule.arrival.map((item, index) => (
                  <article
                    className="card"
                    key={`arr-${item.uid || index}`}
                  >
                    <h3>{item.title || "Электричка"}</h3>
                    <p><strong>Номер:</strong> {item.number || "—"}</p>
                    <p><strong>Направление:</strong> {item.direction || "—"}</p>
                    <p><strong>Прибытие:</strong> {item.arrival || "—"}</p>
                    <p><strong>Отправление:</strong> {item.departure || "—"}</p>
                    <p><strong>Платформа:</strong> {item.platform || "—"}</p>
                    <p><strong>Дни:</strong> {item.days || "—"}</p>
                    <p><strong>Перевозчик:</strong> {item.carrier || "—"}</p>
                  </article>
                ))
              ) : (
                <div className="empty">Нет прибытий на выбранную дату</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderRouteContent() {
    return (
      <div className="sheet-block">
        <div className="sheet-header">
          <h2>Маршрут между станциями</h2>
          <p>Выберите станции на карте или в поиске и получите список электричек</p>
        </div>

        <div className="route-form">
          <div className="route-field">
            <div className="route-label">Откуда</div>
            <div className="route-value">
              {routeFrom
                ? `${routeFrom.title} (${routeFrom.code})`
                : "Не выбрано"}
            </div>
          </div>

          <div className="route-field">
            <div className="route-label">Куда</div>
            <div className="route-value">
              {routeTo
                ? `${routeTo.title} (${routeTo.code})`
                : "Не выбрано"}
            </div>
          </div>

          <div className="route-field">
            <div className="route-label">Дата</div>
            <div className="route-input-wrap">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {routes ? (
          routes.segments?.length ? (
            <div className="schedule-scroll">
              <div className="result-section">
                <h3>Найденные маршруты</h3>
                <div className="cards">
                  {routes.segments.map((seg, index) => (
                    <article
                      className="card"
                      key={`seg-${seg.uid || index}`}
                    >
                      <h3>{seg.title || "Маршрут"}</h3>
                      <p><strong>Отправление:</strong> {seg.departure || "—"}</p>
                      <p><strong>Прибытие:</strong> {seg.arrival || "—"}</p>
                      <p><strong>Номер:</strong> {seg.number || "—"}</p>
                      <p><strong>Перевозчик:</strong> {seg.carrier || "—"}</p>
                      <p><strong>Станции:</strong> {seg.fromTitle} → {seg.toTitle}</p>
                      <p><strong>Пересадки:</strong> {seg.hasTransfers ? "есть" : "нет"}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty">Маршрутов на выбранную дату не найдено</div>
          )
        ) : (
          <div className="result-section">
            <h3>Ближайшие станции</h3>
            <div className="list list-nearby">{renderNearbyStations()}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page map-page">
      <div className="map-fullscreen">
        <MapView markers={markers} onMapClick={handleMapClick} />

        <div className="top-bar">
          <div className="top-panel">
            <h1>Прибывалка для электричек</h1>
            <p>Найдите станцию по названию, выберите её на карте и посмотрите расписание</p>

            <div className="top-controls">
              <input
                type="text"
                placeholder="Например, Самара"
                value={searchQuery}
                onChange={handleSearchChange}
              />

              <div className="date-inline">
                <label htmlFor="date">Дата</label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="search-list">{renderSearchResults()}</div>

            {error && <div className="error">{error}</div>}
          </div>

          <div className="floating-modes">
            <button
              className={`mode-chip ${mode === "station" ? "active" : ""}`}
              onClick={() => {
                setMode("station");
                setRoutes(null);
                setSheetOpen(true);
              }}
            >
              По станции
            </button>

            <button
              className={`mode-chip ${mode === "route" ? "active" : ""}`}
              onClick={() => {
                setMode("route");
                setSchedule(null);
                setSheetOpen(true);
              }}
            >
              Между станциями
            </button>
          </div>
        </div>

        {selectedStation && (
          <div className="station-modal">
            <div className="station-modal-head">
              <div>
                <div className="station-modal-title">{selectedStation.title}</div>
                <div className="station-modal-subtitle">
                  {selectedStation.settlementTitle ||
                    selectedStation.regionTitle ||
                    selectedStation.countryTitle ||
                    selectedStation.code}
                </div>
              </div>

              <button
                className="icon-close"
                onClick={() => {
                  setSelectedStation(null);
                  if (mode === "station") {
                    setSchedule(null);
                  }
                }}
              >
                ×
              </button>
            </div>

            <div className="station-modal-body">
              {mode === "station" ? (
                <button className="full-button" onClick={loadSchedule}>
                  Показать расписание станции
                </button>
              ) : (
                <button className="full-button" onClick={loadRoutes}>
                  Показать маршруты
                </button>
              )}
            </div>
          </div>
        )}

        <div className={`bottom-sheet ${sheetOpen ? "open" : "collapsed"}`}>
          <button
            className="sheet-handle"
            onClick={() => setSheetOpen((prev) => !prev)}
          ></button>

          <div className="sheet-content">
            {mode === "station" ? renderStationContent() : renderRouteContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
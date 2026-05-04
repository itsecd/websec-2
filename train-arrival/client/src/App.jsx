import { useCallback, useState } from "react";
import "./App.css";
import MapView from "./MapView";
import {
  getNearbyStations,
  getStationSchedule,
  searchStations,
  searchRoutes,
} from "./api";

import SearchResultsList from "@components/SearchResultsList";
import StationScheduleSheet from "@components/StationScheduleSheet";
import RouteSheet from "@components/RouteSheet";
import StationModal from "@components/StationModal";
import BottomSheet from "@components/BottomSheet";

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

  return (
    <div className="page map-page">
      <div className="map-fullscreen">
        <MapView markers={markers} onMapClick={handleMapClick} />

        <div className="top-bar">
          <div className="top-panel">
            <h1>Прибывалка для электричек</h1>
            <p>
              Найдите станцию по названию, выберите её на карте и посмотрите
              расписание
            </p>

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

            <div className="search-list">
              <SearchResultsList
                searchQuery={searchQuery}
                searchResults={searchResults}
                selectedStation={selectedStation}
                onSelect={handleSelectFromSearch}
              />
            </div>

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

        <StationModal
          mode={mode}
          selectedStation={selectedStation}
          onClose={() => {
            setSelectedStation(null);
            if (mode === "station") {
              setSchedule(null);
            }
          }}
          onShowSchedule={loadSchedule}
          onShowRoutes={loadRoutes}
        />

        <BottomSheet
          open={sheetOpen}
          onToggle={() => setSheetOpen((prev) => !prev)}
        >
          {mode === "station" ? (
            <StationScheduleSheet
              schedule={schedule}
              selectedStation={selectedStation}
              nearby={nearby}
              onSelectNearby={handleSelectNearby}
            />
          ) : (
            <RouteSheet
              routeFrom={routeFrom}
              routeTo={routeTo}
              date={date}
              setDate={setDate}
              routes={routes}
              nearby={nearby}
              selectedStation={selectedStation}
              onSelectNearby={handleSelectNearby}
            />
          )}
        </BottomSheet>
      </div>
    </div>
  );
}

export default App;
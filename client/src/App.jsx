import { useEffect, useState } from "react";
import { loadNearbyStations, loadRoutesBetweenStations, loadStationSchedule } from "./api/client";
import { AppHeader } from "./components/AppHeader";
import { FavoritesPanel } from "./components/FavoritesPanel";
import { RouteSearchPanel } from "./components/RouteSearchPanel";
import { StationSchedulePanel } from "./components/StationSchedulePanel";
import { StationSearchPanel } from "./components/StationSearchPanel";
import { THEME_STORAGE_KEY } from "./config/app";
import { MAP_POINT_SEARCH_DISTANCE } from "./config/map";
import { useFavorites } from "./hooks/useFavorites";
import { todayDateValue } from "./utils/dates";
import { readStoredValue, writeStoredValue } from "./utils/storage";

const DEFAULT_THEME = "light";

function getSavedTheme() {
    const savedTheme = readStoredValue(THEME_STORAGE_KEY, DEFAULT_THEME);
    return savedTheme === "dark" ? "dark" : DEFAULT_THEME;
}

function openSection(sectionId) {
    window.location.hash = sectionId;
}

export default function App() {
    const [theme, setTheme] = useState(getSavedTheme);
    const [selectedStation, setSelectedStation] = useState(null);
    const [pickedMapPoint, setPickedMapPoint] = useState(null);
    const [stationDate, setStationDate] = useState(todayDateValue());
    const [scheduleEntries, setScheduleEntries] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleError, setScheduleError] = useState("");

    const [nearbyStations, setNearbyStations] = useState([]);
    const [nearbyStationsLoading, setNearbyStationsLoading] = useState(false);
    const [nearbyStationsError, setNearbyStationsError] = useState("");

    const [routeFromStation, setRouteFromStation] = useState(null);
    const [routeToStation, setRouteToStation] = useState(null);
    const [routeDate, setRouteDate] = useState(todayDateValue());
    const [routeSegments, setRouteSegments] = useState([]);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState("");

    const { favoriteStations, addFavorite, removeFavorite, hasFavorite } = useFavorites();

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
        writeStoredValue(THEME_STORAGE_KEY, theme);
    }, [theme]);

    useEffect(() => {
        if (!selectedStation?.code) {
            setScheduleEntries([]);
            setScheduleError("");
            return;
        }

        let isCancelled = false;

        async function fetchSchedule() {
            setScheduleLoading(true);
            setScheduleError("");

            try {
                const response = await loadStationSchedule(selectedStation.code, stationDate);

                if (isCancelled) {
                    return;
                }

                setScheduleEntries(response.entries || []);
            } catch (error) {
                if (!isCancelled) {
                    setScheduleError(error.message);
                }
            } finally {
                if (!isCancelled) {
                    setScheduleLoading(false);
                }
            }
        }

        void fetchSchedule();

        return () => {
            isCancelled = true;
        };
    }, [selectedStation, stationDate]);

    function selectStation(station) {
        setSelectedStation(station);

        if (station?.lat != null && station?.lng != null) {
            setPickedMapPoint({
                lat: station.lat,
                lng: station.lng,
            });
        }
    }

    async function handleMapPointPick(point) {
        setPickedMapPoint(point);
        setNearbyStationsLoading(true);
        setNearbyStationsError("");

        try {
            const response = await loadNearbyStations(
                point.lat,
                point.lng,
                MAP_POINT_SEARCH_DISTANCE,
            );

            setNearbyStations(response.stations || []);
        } catch (error) {
            setNearbyStationsError(error.message);
        } finally {
            setNearbyStationsLoading(false);
        }
    }

    function handleFavoriteToggle(station) {
        if (station && hasFavorite(station.code)) {
            removeFavorite(station.code);
            return;
        }

        if (station) {
            addFavorite(station);
        }
    }

    async function handleRouteSubmit(event) {
        event.preventDefault();

        if (!routeFromStation?.code || !routeToStation?.code) {
            setRouteError("Выберите обе станции, прежде чем запускать поиск.");
            return;
        }

        setRouteLoading(true);
        setRouteError("");

        try {
            const response = await loadRoutesBetweenStations(
                routeFromStation.code,
                routeToStation.code,
                routeDate,
            );

            setRouteSegments(response.segments || []);
        } catch (error) {
            setRouteError(error.message);
        } finally {
            setRouteLoading(false);
        }
    }

    function handleFavoritePick(station) {
        selectStation(station);
        openSection("#station-panel");
    }

    function handleFavoriteUseAsRouteFrom(station) {
        setRouteFromStation(station);
        openSection("#route-panel");
    }

    function handleFavoriteUseAsRouteTo(station) {
        setRouteToStation(station);
        openSection("#route-panel");
    }

    function handleThemeToggle() {
        setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
    }

    return (
        <div className="app-shell">
            <AppHeader theme={theme} onThemeToggle={handleThemeToggle} />

            <main className="layout">
                <div className="layout__main">
                    <StationSearchPanel
                        selectedStation={selectedStation}
                        onStationSelect={selectStation}
                        onFavoriteToggle={handleFavoriteToggle}
                        isFavorite={hasFavorite}
                        onMapPointPick={handleMapPointPick}
                        pickedPoint={pickedMapPoint}
                        nearbyStations={nearbyStations}
                        nearbyStationsLoading={nearbyStationsLoading}
                        nearbyStationsError={nearbyStationsError}
                    />

                    <StationSchedulePanel
                        selectedStation={selectedStation}
                        selectedDate={stationDate}
                        onDateChange={setStationDate}
                        isLoading={scheduleLoading}
                        errorText={scheduleError}
                        scheduleEntries={scheduleEntries}
                    />

                    <RouteSearchPanel
                        fromStation={routeFromStation}
                        toStation={routeToStation}
                        selectedDate={routeDate}
                        onFromStationSelect={setRouteFromStation}
                        onToStationSelect={setRouteToStation}
                        onDateChange={setRouteDate}
                        onSubmit={handleRouteSubmit}
                        isLoading={routeLoading}
                        errorText={routeError}
                        routeSegments={routeSegments}
                    />
                </div>

                <aside className="layout__aside">
                    <FavoritesPanel
                        favoriteStations={favoriteStations}
                        onPickStation={handleFavoritePick}
                        onRemoveFavorite={removeFavorite}
                        onUseAsRouteFrom={handleFavoriteUseAsRouteFrom}
                        onUseAsRouteTo={handleFavoriteUseAsRouteTo}
                        selectedStationCode={selectedStation?.code || ""}
                    />
                </aside>
            </main>
        </div>
    );
}

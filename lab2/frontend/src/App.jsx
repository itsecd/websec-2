import { useState, useEffect } from 'react';
import { stationAPI } from './services/api';
import { favoritesService } from './services/favorites';
import StationSearch from './components/StationSearch';
import RouteSearch from './components/RouteSearch';
import ScheduleList from './components/ScheduleList';
import FavoritesList from './components/FavoritesList';
import MapSearch from './components/MapSearch';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [schedule, setSchedule] = useState(null);
  const [routeSchedule, setRouteSchedule] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [appLoading, setAppLoading] = useState(true); 

  useEffect(() => {
    refreshFavorites();
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        refreshFavorites();
        
        // Триггерим загрузку кэша на бэкенде
        console.log('Загрузка кэша станций...');
        await fetch('http://localhost:8000/api/cache/load', { method: 'POST' });
        console.log('Кэш загружен');
        
      } catch (err) {
        console.error('Ошибка инициализации:', err);
      } finally {
        setAppLoading(false);
      }
    };
    
    initializeApp();
  }, []);

  const refreshFavorites = () => {
    setFavorites(favoritesService.getAll());
  };

  const toggleFavorite = (station) => {
    if (favoritesService.isFavorite(station.code)) {
      favoritesService.remove(station.code);
    } else {
      favoritesService.add(station);
    }
    refreshFavorites();
  };

  const loadStationSchedule = async (stationCode, stationTitle) => {
    setLoading(true);
    setError(null);
    try {
      const response = await stationAPI.getSchedule(stationCode);
      setSchedule({ 
        station: { code: stationCode, title: stationTitle }, 
        ...response.data 
      });
      setRouteSchedule(null);
    } catch (err) {
      console.error('Ошибка загрузки расписания:', err);
      setError('Не удалось загрузить расписание. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const loadRouteSchedule = async (fromStation, toStation) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Загрузка маршрута:', {
        fromCode: fromStation.code,
        toCode: toStation.code
      });
      
      const response = await stationAPI.getRoute(fromStation.code, toStation.code);
      console.log('Ответ от бэкенда:', response.data);
      
      setRouteSchedule({
        from: fromStation,
        to: toStation,
        ...response.data
      });
      setSchedule(null);
    } catch (err) {
      console.error('Ошибка загрузки маршрута:', err);
      setError('Не удалось загрузить расписание маршрута. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStation = (station) => {
    loadStationSchedule(station.code, station.title);
  };

  const handleSelectRoute = (from, to) => {
    loadRouteSchedule(from, to);
  };

  if (appLoading) {
    return (
      <div className="d-flex flex-column min-vh-100">
        <header className="header">
          <div className="container">
            <h1 className="h4 mb-0">🚆 Прибывалка</h1>
          </div>
        </header>
        <main className="container flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Загрузка...</span>
            </div>
            <h2>Загрузка приложения...</h2>
            <p className="text-muted">Загружаем список станций</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Header */}
      <header className="header">
        <div className="container d-flex justify-content-between align-items-center">
          <h1 className="h4 mb-0">🚆 Прибывалка</h1>
          <span className="text-white-50">Расписание электричек</span>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="container py-3">
        <div className="tabs" role="tablist">
          <button 
            className={`tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
            role="tab"
            aria-selected={activeTab === 'search'}
          >
            <i className="bi bi-search me-2"></i>Поиск
          </button>
          <button 
            className={`tab ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
            role="tab"
            aria-selected={activeTab === 'map'}
          >
            <i className="bi bi-map me-2"></i>Карта
          </button>
          <button 
            className={`tab ${activeTab === 'route' ? 'active' : ''}`}
            onClick={() => setActiveTab('route')}
            role="tab"
            aria-selected={activeTab === 'route'}
          >
            <i className="bi bi-signpost-split me-2"></i>Маршрут
          </button>
          <button 
            className={`tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
            role="tab"
            aria-selected={activeTab === 'favorites'}
          >
            <i className="bi bi-heart me-2"></i>Избранное
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container flex-grow-1 pb-4">
        {activeTab === 'search' && (
          <StationSearch 
            onSelect={handleSelectStation}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        )}
        
        {activeTab === 'map' && (
          <MapSearch 
            onSelectStation={handleSelectStation}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        )}
        
        {activeTab === 'route' && (
          <RouteSearch 
            onSelect={handleSelectRoute}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        )}
        
        {activeTab === 'favorites' && (
          <FavoritesList 
            favorites={favorites}
            onSelectStation={handleSelectStation}
            onRemove={refreshFavorites}
          />
        )}

        {/* Loading State */}
        {loading && (
          <div className="card">
            <div className="text-center text-muted py-4">
              <div className="spinner-border text-primary me-2" role="status">
                <span className="visually-hidden">Загрузка...</span>
              </div>
              Загрузка расписания...
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {/* Schedule Display */}
        {schedule && !loading && !error && (
          <ScheduleList 
            data={schedule} 
            title={`Расписание: ${schedule.station?.title}`}
            isFavorite={(code) => favoritesService.isFavorite(code)}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {routeSchedule && !loading && !error && (
          <ScheduleList 
            data={routeSchedule}
            title={`Маршрут: ${routeSchedule.from?.title} → ${routeSchedule.to?.title}`}
            isFavorite={(code) => favoritesService.isFavorite(code)}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>

      {/* Footer */}
      <footer>
        <p>Данные: <a href="https://yandex.ru/dev/rasp/" target="_blank" rel="noopener noreferrer">Яндекс.Расписания</a></p>
      </footer>
    </div>
  );
}

export default App;
import { useState, useEffect } from 'react';
import { stationAPI } from '../services/api';
import { DEFAULT_MAP_CENTER, MAP_SEARCH_PARAMS } from '../config/mapConfig';

export default function StationSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNearby = async () => {
      try {
        const { lat, lng } = DEFAULT_MAP_CENTER;
        const { distance } = MAP_SEARCH_PARAMS.initial;
        
        const response = await stationAPI.nearby(lat, lng, distance);
        if (response?.stations) {
          setStations(response.stations);
        }
      } catch (err) {
        console.error('Ошибка загрузки станций:', err);
      }
    };
    fetchNearby();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setStations([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await stationAPI.search(query);
        if (response?.stations) {
          const filtered = response.stations.filter(s => 
            s.title?.toLowerCase().includes(query.toLowerCase()) ||
            s.short_title?.toLowerCase().includes(query.toLowerCase())
          );
          setStations(filtered);
        }
      } catch (err) {
        setError('Ошибка поиска. Попробуйте позже.');
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (station) => {
    onSelect(station);
    setQuery('');
    setStations([]);
  };

  return (
    <div>
      <div className="input-group mb-3">
        <input
          type="search"
          className="form-control form-control-lg"
          placeholder="Найдите станцию..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Поиск железнодорожной станции"
        />
        <button 
          className="btn btn-primary" 
          type="button"
          disabled={query.length < 2}
        >
          <i className="bi bi-search"></i> Найти
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading && query.length >= 2 && (
        <div className="text-center text-muted py-3">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          Поиск станций...
        </div>
      )}

      {stations.length > 0 && (
        <div className="card">
          <h3 className="h6 mb-3">
            Найдено станций: {stations.length}
            <span className="text-muted small ms-2">
              (вокруг {DEFAULT_MAP_CENTER.label})
            </span>
          </h3>
          <div className="list-group list-group-flush">
            {stations.map((station) => (
              <button
                key={station.code}
                className="list-group-item list-group-item-action station-item"
                onClick={() => handleSelect(station)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-medium">{station.title}</div>
                    <div className="text-muted small">
                      {station.station_type === 'railway' ? 'ЖД станция' : station.station_type}
                    </div>
                  </div>
                  <i className="bi bi-chevron-right text-muted"></i>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {query.length >= 2 && stations.length === 0 && !loading && !error && (
        <div className="text-center text-muted py-4">
          <i className="bi bi-search display-6 d-block mb-2"></i>
          Станции не найдены
        </div>
      )}
    </div>
  );
}
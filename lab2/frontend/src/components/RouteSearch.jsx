import { useState, useEffect } from 'react';
import { stationAPI } from '../services/api';

export default function RouteSearch({ onSelect }) {
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromStations, setFromStations] = useState([]);
  const [toStations, setToStations] = useState([]);
  const [selectedFrom, setSelectedFrom] = useState(null);
  const [selectedTo, setSelectedTo] = useState(null);
  const [possibleDestinations, setPossibleDestinations] = useState([]);
  const [loadingDestinations, setLoadingDestinations] = useState(false);

  useEffect(() => {
    if (fromQuery.length < 2) {
      setFromStations([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await stationAPI.search(fromQuery);
        if (response.data?.stations) {
          setFromStations(response.data.stations.slice(0, 5));
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [fromQuery]);

  useEffect(() => {
    if (toQuery.length < 2 || possibleDestinations.length > 0) {
      if (possibleDestinations.length > 0 && toQuery.length >= 2) {
        const filtered = possibleDestinations.filter(s => 
          s.title.toLowerCase().includes(toQuery.toLowerCase())
        ).slice(0, 10);
        setToStations(filtered);
      } else {
        setToStations([]);
      }
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await stationAPI.search(toQuery);
        if (response.data?.stations) {
          setToStations(response.data.stations.slice(0, 5));
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [toQuery, possibleDestinations]);

  useEffect(() => {
    if (!selectedFrom?.code) {
      setPossibleDestinations([]);
      return;
    }

    const loadDestinations = async () => {
      setLoadingDestinations(true);
      try {
        console.log('Загрузка направлений для:', selectedFrom.title);
        const response = await stationAPI.getSchedule(selectedFrom.code);
        
        if (response.data?.schedule) {
          const destinationsMap = new Map();
          
          response.data.schedule.forEach(item => {
            const toStation = item.to;
            if (toStation?.code && toStation?.title) {
              if (!destinationsMap.has(toStation.code)) {
                destinationsMap.set(toStation.code, {
                  code: toStation.code,
                  title: toStation.title,
                  short_title: toStation.short_title || toStation.title,
                  direction: item.direction || ''
                });
              }
            }
          });
          
          const destinations = Array.from(destinationsMap.values());
          console.log(`Найдено ${destinations.length} направлений`);
          setPossibleDestinations(destinations);
        }
      } catch (err) {
        console.error('Error loading destinations:', err);
      } finally {
        setLoadingDestinations(false);
      }
    };
    
    loadDestinations();
  }, [selectedFrom]);

  const handleSearch = () => {
    if (selectedFrom && selectedTo) {
      console.log('Отправка маршрута:', {
        from: {
          code: selectedFrom.code,
          title: selectedFrom.title
        },
        to: {
          code: selectedTo.code,
          title: selectedTo.title
        }
      });
      
      onSelect(selectedFrom, selectedTo);
    } else {
      console.warn('Не выбраны обе станции');
      alert('Пожалуйста, выберите обе станции');
    }
  };

  const clearFrom = () => {
    setSelectedFrom(null);
    setFromQuery('');
    setPossibleDestinations([]);
    setToStations([]);
  };

  const clearTo = () => {
    setSelectedTo(null);
    setToQuery('');
  };

  return (
    <div>
      <div className="card mb-3">
        <h3 className="h5 mb-3">
          <i className="bi bi-signpost-split me-2"></i>
          Маршрут между станциями
        </h3>
        
        {/* Станция отправления */}
        <div className="mb-3">
          <label className="form-label fw-medium">
            <i className="bi bi-geo-alt me-1"></i>
            Откуда
          </label>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Введите станцию отправления"
              value={fromQuery}
              onChange={(e) => {
                setFromQuery(e.target.value);
                setSelectedFrom(null);
                setPossibleDestinations([]);
              }}
            />
            {selectedFrom && (
              <button 
                className="btn btn-outline-secondary" 
                type="button"
                onClick={clearFrom}
                aria-label="Очистить"
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
          
          {fromStations.length > 0 && !selectedFrom && (
            <div className="list-group mt-2">
              {fromStations.map((station) => (
                <button
                  key={station.code}
                  className="list-group-item list-group-item-action"
                  onClick={() => {
                    setSelectedFrom(station);
                    setFromQuery(station.title);
                    setFromStations([]);
                    setToQuery(''); // Очищаем "куда"
                  }}
                >
                  <div className="fw-medium">{station.title}</div>
                  <div className="text-muted small">
                    {station.direction && `${station.direction} направление`}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {selectedFrom && (
            <div className="alert alert-success mt-2 py-2">
              <i className="bi bi-check-circle me-1"></i>
              Выбрано: {selectedFrom.title}
              {loadingDestinations && (
                <span className="ms-2">
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  Загрузка направлений...
                </span>
              )}
              {!loadingDestinations && possibleDestinations.length > 0 && (
                <div className="small text-muted mt-1">
                  Доступно {possibleDestinations.length} направлений
                </div>
              )}
            </div>
          )}
        </div>

        {/* Станция назначения */}
        <div className="mb-3">
          <label className="form-label fw-medium">
            <i className="bi bi-geo-alt-fill me-1"></i>
            Куда
          </label>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder={possibleDestinations.length > 0 ? "Введите или выберите направление" : "Введите станцию назначения"}
              value={toQuery}
              onChange={(e) => {
                setToQuery(e.target.value);
                setSelectedTo(null);
              }}
              onFocus={() => {
                if (possibleDestinations.length > 0 && toQuery.length < 2) {
                  setToStations(possibleDestinations.slice(0, 20));
                }
              }}
            />
            {selectedTo && (
              <button 
                className="btn btn-outline-secondary" 
                type="button"
                onClick={clearTo}
                aria-label="Очистить"
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
          
          {toStations.length > 0 && !selectedTo && (
            <div className="list-group mt-2">
              {toStations.map((station) => (
                <button
                  key={station.code}
                  className="list-group-item list-group-item-action"
                  onClick={() => {
                    setSelectedTo(station);
                    setToQuery(station.title);
                    setToStations([]);
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="fw-medium">{station.title}</div>
                    {station.direction && (
                      <span className="badge bg-secondary">{station.direction}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {selectedTo && (
            <div className="alert alert-success mt-2 py-2">
              <i className="bi bi-check-circle me-1"></i>
              Выбрано: {selectedTo.title}
            </div>
          )}
          
          {possibleDestinations.length === 0 && selectedFrom && !loadingDestinations && (
            <div className="alert alert-info mt-2 py-2 small">
              <i className="bi bi-info-circle me-1"></i>
              Нет данных о направлениях. Введите станцию вручную.
            </div>
          )}
        </div>

        {/* Кнопка поиска */}
        <button 
          className="btn btn-primary w-100"
          onClick={handleSearch}
          disabled={!selectedFrom || !selectedTo}
        >
          <i className="bi bi-search me-2"></i>
          Найти расписание
        </button>
      </div>
    </div>
  );
}
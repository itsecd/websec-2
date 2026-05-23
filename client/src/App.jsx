import { useState } from 'react'
import './App.css'
import MapComponent from './components/Map'
import Schedule from './components/Schedule'
import RouteSearch from './components/RouteSearch'
import RouteResults from './components/RouteResults'

function App() {
  const [currentStations, setCurrentStations] = useState([])
  const [knownStations, setKnownStations] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [routeSegments, setRouteSegments] = useState(null)
  const [routeError, setRouteError] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setRouteSegments(null)
    setRouteError(null)
    setSelectedStation(null)

    try {
      const res = await fetch(`/api/rasp/find-stations?name=${encodeURIComponent(query)}&region=samara`)
      const data = await res.json()
      const found = data.stations || []

      setCurrentStations(found)

      setKnownStations(prev => {
        const combined = [...prev, ...found]
        return [...new Map(combined.map(item => [item.code, item])).values()]
      })
    } catch (err) {
      console.error('Ошибка поиска:', err)
      alert('Ошибка сети. Проверьте подключение.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Расписание электричек</h1>
        <p>Справочная система Самарской области</p>
      </header>

      <main className="main">
        {/* 1. Поиск */}
        <section className="card">
          <h2 className="card-title">Поиск</h2>
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              placeholder="Введите город (например, Самара)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Загрузка...' : 'Найти'}
            </button>
          </form>
        </section>

        {currentStations.length > 0 && (
          <>
            <section className="card">
              <div className="map-wrapper">
                <MapComponent
                  stations={currentStations}
                  selectedStation={selectedStation}
                  onStationSelect={setSelectedStation}
                />
              </div>
              
              <h3 className="card-title">Станции в регионе ({currentStations.length})</h3>
              <ul className="station-list">
                {currentStations.map(st => (
                  <li
                    key={st.code}
                    className={`station-item ${selectedStation?.code === st.code ? 'selected' : ''}`}
                    onClick={() => setSelectedStation(st)}
                  >
                    <strong>{st.title}</strong>
                    <br />
                    <small>
                      {Number(st.latitude).toFixed(4)}, {Number(st.longitude).toFixed(4)}
                    </small>
                  </li>
                ))}
              </ul>
            </section>

            {selectedStation && (
              <section className="card">
                <h2 className="card-title"> Расписание: {selectedStation.title}</h2>
                <Schedule station={selectedStation} />
              </section>
            )}
          </>
        )}

        {knownStations.length > 0 && (
          <section className="card">
            <h2 className="card-title">Построение маршрута</h2>
            <p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
              Выберите станции отправления и назначения из списка найденных.
            </p>
            <RouteSearch
              stations={knownStations}
              onRouteFound={(segments, error) => {
                setRouteSegments(segments)
                setRouteError(error)
              }}
            />
            <RouteResults segments={routeSegments} error={routeError} />
          </section>
        )}

        {currentStations.length === 0 && !loading && (
          <div className="empty">
            Введите название города в поле поиска выше и нажмите <strong>«Найти»</strong>, чтобы загрузить карту и расписание.
          </div>
        )}
      </main>
    </div>
  )
}

export default App
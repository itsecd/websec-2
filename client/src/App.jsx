import { useState } from 'react'
import './App.css'
import MapComponent from './components/Map'
import Schedule from './components/Schedule'

function App() {
  const [stations, setStations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/rasp/find-stations?name=${encodeURIComponent(searchQuery)}&region=samara`)
      const data = await response.json()
      setStations(data.stations || [])
      setSelectedStation(null)
    } catch (err) {
      console.error('Ошибка поиска:', err)
      alert('Не удалось загрузить данные')
    }
    setLoading(false)
  }

  const handleStationSelect = (station) => {
    setSelectedStation(station)
    setSearchQuery(station.title)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Расписание электричек</h1>
      </header>

      <main className="main">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Введите название станции..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" disabled={loading} className="search-btn">
            {loading ? 'Поиск...' : 'Найти'}
          </button>
        </form>

        {stations.length > 0 && (
          <MapComponent 
            stations={stations} 
            selectedStation={selectedStation}
            onStationSelect={handleStationSelect}
          />
        )}

        {selectedStation && (
          <div className="selected-station" style={{
            background: '#e3f2fd',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <h3>Выбрана: {selectedStation.title}</h3>
            <p>Код: {selectedStation.code}</p>
            <p>Координаты: {Number(selectedStation.latitude).toFixed(4)}, {Number(selectedStation.longitude).toFixed(4)}</p>
          </div>
        )}

        {stations.length > 0 && (
          <div className="results">
            <h2>Найдено станций: {stations.length}</h2>
            <ul className="stations-list">
              {stations.map((station) => (
                <li 
                  key={station.code} 
                  className={`station-item ${selectedStation?.code === station.code ? 'selected' : ''}`}
                  onClick={() => handleStationSelect(station)}
                  style={{ cursor: 'pointer' }}
                >
                  <strong>{station.title}</strong>
                  <br />
                  <small>
                    Код: {station.code} | 
                    Координаты: {Number(station.latitude).toFixed(4)}, {Number(station.longitude).toFixed(4)}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stations.length === 0 && searchQuery && !loading && (
          <p className="empty">Ничего не найдено </p>
        )}
        {selectedStation && <Schedule station={selectedStation} />}
      </main>
    </div>
  )
}

export default App
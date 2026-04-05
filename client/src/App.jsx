import { useState } from 'react'
import './App.css'

function App() {
  const [stations, setStations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/rasp/find-stations?name=${encodeURIComponent(searchQuery)}&region=samara`)
      const data = await response.json()
      setStations(data.stations || [])
    } catch (err) {
      console.error('Ошибка поиска:', err)
      alert('Не удалось загрузить данные')
    }
    setLoading(false)
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
          <div className="results">
            <h2>Найдено станций: {stations.length}</h2>
            <ul className="stations-list">
              {stations.map((station) => {
                const lat = Number(station.latitude)
                const lng = Number(station.longitude)
                
                return (
                  <li key={station.code} className="station-item">
                    <strong>{station.title}</strong>
                    <br />
                    <small>
                      Код: {station.code} | 
                      Координаты: {isNaN(lat) ? 'N/A' : lat.toFixed(4)}, {isNaN(lng) ? 'N/A' : lng.toFixed(4)}
                    </small>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {stations.length === 0 && searchQuery && !loading && (
          <p className="empty">Ничего не найдено </p>
        )}
      </main>
    </div>
  )
}

export default App
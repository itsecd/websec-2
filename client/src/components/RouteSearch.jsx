import { useState } from 'react'

function RouteSearch({ stations, onRouteFound }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const fromStation = stations.find(s => s.title === from)
    const toStation = stations.find(s => s.title === to)

    if (!fromStation || !toStation) {
      setError('Пожалуйста, выберите станции из выпадающего списка')
      onRouteFound(null, 'Станции не выбраны')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/rasp/route?from=${fromStation.code}&to=${toStation.code}&date=${date}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Маршрут не найден')
      onRouteFound(data.segments || [], null)
    } catch (err) {
      setError(err.message)
      onRouteFound(null, err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="route-grid">
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Откуда</label>
          <input 
            className="route-input" 
            list="st-list" 
            value={from} 
            onChange={e => setFrom(e.target.value)} 
            placeholder="Станция отправления" 
            required 
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Куда</label>
          <input 
            className="route-input" 
            list="st-list" 
            value={to} 
            onChange={e => setTo(e.target.value)} 
            placeholder="Станция назначения" 
            required 
          />
        </div>
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Дата поездки</label>
        <input 
          className="route-input" 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)} 
        />
      </div>

      <datalist id="st-list">
        {stations.map(s => <option key={s.code} value={s.title} />)}
      </datalist>

      {error && <p className="error">{error}</p>}
      
      <button type="submit" disabled={loading} className="route-btn">
        {loading ? 'Ищем маршрут...' : 'Построить маршрут'}
      </button>
    </form>
  )
}
export default RouteSearch
import { useState, useEffect } from 'react'

function Schedule({ station }) {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

useEffect(() => {
  if (!station?.code) return

  const fetchSchedule = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Запрос расписания для:', station.code)
      const res = await fetch(`/api/rasp/schedule?station_code=${station.code}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Ошибка сервера')
      if (data.fallback) throw new Error('API вернул ошибку')

      const items = (data.schedule || []).map(item => ({
        title: item.thread?.title || item.thread?.short_title || 'Поезд',
        number: item.thread?.number || '',
        departure: item.departure ? new Date(item.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
        arrival: item.arrival ? new Date(item.arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
        platform: item.platform || item.departure_platform || '',
        carrier: item.thread?.carrier?.title || ''
      }))

      setSchedule(items)
    } catch (err) {
      console.error('Ошибка загрузки расписания:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  fetchSchedule()
}, [station.code])

  if (!station) return null
  if (loading) return <p style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>Загрузка расписания...</p>
  if (error) return <p style={{ textAlign: 'center', padding: '1rem', color: 'red' }}>Ошибка: {error}</p>
  if (schedule.length === 0) return <p style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>Расписание на сегодня пустое</p>

  return (
    <div className="schedule-container">
      <h3>Расписание: {station.title}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Поезд</th>
              <th>Отправление</th>
              <th>Прибытие</th>
              <th>Платформа</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((train, idx) => (
              <tr key={idx}>
                <td>
                  <strong>{train.title}</strong> {train.number && `№${train.number}`}
                  {train.carrier && <div style={{ fontSize: '0.8rem', color: '#666' }}>{train.carrier}</div>}
                </td>
                <td>{train.departure}</td>
                <td>{train.arrival}</td>
                <td>{train.platform || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Schedule
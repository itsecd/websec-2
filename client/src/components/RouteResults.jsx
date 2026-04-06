function RouteResults({ segments, error }) {
  if (error) {
    return (
      <div style={{
        background: '#ffebee',
        color: '#c62828',
        padding: '1rem',
        borderRadius: '12px',
        marginBottom: '1rem',
        border: '1px solid #ef9a9a'
      }}>
        <strong>Не удалось построить маршрут</strong>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
          {error.includes('Не нашли объект') 
            ? 'Одна из станций не поддерживает поиск маршрутов. Попробуйте выбрать крупную станцию (например, "Самара").' 
            : error}
        </p>
      </div>
    )
  }
  
  if (!segments?.length) return null

  return (
    <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
      <h3>Найдено рейсов: {segments.length}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Поезд</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Время</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>В пути</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((seg, i) => {
              const departure = seg.departure ? new Date(seg.departure) : null
              const arrival = seg.arrival ? new Date(seg.arrival) : null
              
              let durationText = '-'
              if (departure && arrival) {
                const diffMins = Math.round((arrival - departure) / 60000)
                const h = Math.floor(diffMins / 60)
                const m = diffMins % 60
                durationText = h > 0 ? `${h}ч ${m}м` : `${m}м`
              }
              
              return (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>
                    {seg.thread?.title || 'Поезд'} {seg.thread?.number && `№${seg.thread.number}`}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {departure?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} — 
                    {arrival?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </td>
                  <td style={{ padding: '0.5rem', fontWeight: 'bold', color: '#2196F3' }}>{durationText}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
export default RouteResults
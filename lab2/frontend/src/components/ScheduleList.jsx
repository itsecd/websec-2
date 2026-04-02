export default function ScheduleList({ data, title, isFavorite, onToggleFavorite }) {
  const { station, schedule = [], segments = [] } = data || {};
  
  const isRoute = segments.length > 0;
  const items = isRoute ? segments : schedule;

  if (!items || items.length === 0) {
    return (
      <div className="card">
        <h3 className="h5 mb-3">
          <i className="bi bi-clock-history me-2"></i>
          {title || 'Расписание'}
        </h3>
        <div className="text-center text-muted py-4">
          <i className="bi bi-calendar-x display-6 d-block mb-2"></i>
          Расписание не найдено
        </div>
      </div>
    );
  }

  const filteredItems = items.filter(item => {
    if (isRoute) {
      const transportType = item.transport_type || item.thread?.transport_type;
      return transportType === 'suburban' || transportType === 'train';
    }
    return item.thread?.transport_type === 'suburban';
  });

  if (filteredItems.length === 0) {
    return (
      <div className="card">
        <h3 className="h5 mb-3">
          <i className="bi bi-clock-history me-2"></i>
          {title || 'Расписание'}
        </h3>
        <p className="text-muted">Нет рейсов в расписании</p>
      </div>
    );
  }

  const stationCode = !isRoute ? station?.code : null;
  const isStationFavorite = stationCode && isFavorite?.(stationCode);

  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    if (typeof timeStr !== 'string') return '--:--';
    if (timeStr.includes('T')) {
      return timeStr.split('T')[1].substring(0, 5);
    }
    return timeStr;
  };

  const getTransportInfo = (item) => {
    const thread = item.thread || item;
    const transportType = thread.transport_type || item.transport_type;
    
    const labels = {
      'suburban': { label: 'Электричка', badge: 'bg-success', icon: 'bi-train-front' },
      'train': { label: 'Поезд', badge: 'bg-primary', icon: 'bi-train' },
      'plane': { label: 'Самолёт', badge: 'bg-info', icon: 'bi-airplane' },
      'bus': { label: 'Автобус', badge: 'bg-warning text-dark', icon: 'bi-bus-front' }
    };
    
    return labels[transportType] || { label: 'Рейс', badge: 'bg-secondary', icon: 'bi-question-circle' };
  };

  return (
    <div className="card">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="h5 mb-0">
          <i className="bi bi-clock-history me-2"></i>
          {title || station?.title || 'Расписание'}
        </h3>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary">
            <i className="bi bi-train-front me-1"></i>
            {filteredItems.length} {isRoute ? 'рейсов' : 'электричек'}
          </span>
          {/* КНОПКА ИЗБРАННОГО — только для одиночной станции */}
          {!isRoute && stationCode && (
            <button 
              className={`btn ${isStationFavorite ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => onToggleFavorite?.(station)}
              title={isStationFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
              aria-label={isStationFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
            >
              <i className={`bi bi-heart${isStationFavorite ? '-fill' : ''}`}></i>
            </button>
          )}
        </div>
      </div>

      <div className="list-group list-group-flush">
        {filteredItems.map((item, index) => {
          if (isRoute) {
            const departure = formatTime(item.departure);
            const arrival = formatTime(item.arrival);
            const thread = item.thread || item;
            const transport = getTransportInfo(item);
            
            return (
              <div key={index} className="train-item py-3 border-bottom">
                <div className="row align-items-center">
                  <div className="col-auto">
                    <div className="fw-bold fs-4 text-primary">
                      {departure}
                    </div>
                  </div>
                  <div className="col">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <span className={`badge ${transport.badge}`}>
                        <i className={`bi ${transport.icon} me-1`}></i>
                        {transport.label}
                      </span>
                      <span className="fw-medium">
                        № {thread.number || thread.title || index + 1}
                      </span>
                    </div>
                    <div className="text-muted small">
                      <i className="bi bi-arrow-right me-1"></i>
                      {item.from?.title} → {item.to?.title}
                    </div>
                    {thread.carrier?.title && (
                      <div className="text-muted small">
                        <i className="bi bi-building me-1"></i>
                        {thread.carrier.title}
                      </div>
                    )}
                  </div>
                  <div className="col-auto text-end">
                    <div className="text-muted small">
                      <i className="bi bi-clock me-1"></i>
                      Приб. {arrival}
                    </div>
                    {thread.transport_subtype?.title && (
                      <div className="text-muted small mt-1">
                        {thread.transport_subtype.title}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          } else {
            const thread = item.thread || {};
            const departure = item.departure || '--:--';
            const arrival = item.arrival !== '00:00' ? item.arrival : null;
            const platform = item.platform?.replace('обычно ', '') || null;
            
            return (
              <div key={index} className="train-item py-3 border-bottom">
                <div className="row align-items-center">
                  <div className="col-auto">
                    <div className="fw-bold fs-4 text-primary">
                      {departure}
                    </div>
                  </div>
                  <div className="col">
                    <div className="fw-medium">
                      № {thread.number}
                    </div>
                    <div className="text-muted small">
                      <i className="bi bi-arrow-right me-1"></i>
                      {thread.title || thread.short_title || 'Направление не указано'}
                    </div>
                    {item.direction && (
                      <div className="text-muted small">
                        <i className="bi bi-signpost me-1"></i>
                        {item.direction}
                      </div>
                    )}
                  </div>
                  <div className="col-auto text-end">
                    {platform && (
                      <span className="badge bg-info text-dark me-2 mb-1">
                        <i className="bi bi-signpost me-1"></i>
                        {platform}
                      </span>
                    )}
                    {arrival && (
                      <div className="text-muted small">
                        <i className="bi bi-clock me-1"></i>
                        Приб. {arrival}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
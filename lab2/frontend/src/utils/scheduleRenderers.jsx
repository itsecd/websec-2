import { formatTime, getTransportInfo, extractTrainData } from './scheduleFormatters';


export function renderEmptySchedule(title) {
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

export function renderNoTrips(title) {
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

export function renderRouteItem(item, index) {
  const departure = formatTime(item.departure);
  const arrival = formatTime(item.arrival);
  const train = extractTrainData(item, true);
  const transport = getTransportInfo(item);
  
  return (
    <div key={index} className="train-item py-3 border-bottom">
      <div className="row align-items-center">
        <div className="col-auto">
          <div className="fw-bold fs-4 text-primary">{departure}</div>
        </div>
        <div className="col">
          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
            <span className={`badge ${transport.badge}`}>
              <i className={`bi ${transport.icon} me-1`}></i>
              {transport.label}
            </span>
            <span className="fw-medium">№ {train.number || index + 1}</span>
          </div>
          <div className="text-muted small">
            <i className="bi bi-arrow-right me-1"></i>
            {train.title}
          </div>
          {train.carrier && (
            <div className="text-muted small">
              <i className="bi bi-building me-1"></i>
              {train.carrier}
            </div>
          )}
        </div>
        <div className="col-auto text-end">
          <div className="text-muted small">
            <i className="bi bi-clock me-1"></i>
            Приб. {arrival}
          </div>
          {train.subtype && (
            <div className="text-muted small mt-1">{train.subtype}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function renderStationItem(item, index) {
  const train = extractTrainData(item, false);
  const departure = item.departure || '--:--';
  
  return (
    <div key={index} className="train-item py-3 border-bottom">
      <div className="row align-items-center">
        <div className="col-auto">
          <div className="fw-bold fs-4 text-primary">{departure}</div>
        </div>
        <div className="col">
          <div className="fw-medium">№ {train.number}</div>
          <div className="text-muted small">
            <i className="bi bi-arrow-right me-1"></i>
            {train.title || 'Направление не указано'}
          </div>
          {train.direction && (
            <div className="text-muted small">
              <i className="bi bi-signpost me-1"></i>
              {train.direction}
            </div>
          )}
        </div>
        <div className="col-auto text-end">
          {train.platform && (
            <span className="badge bg-info text-dark me-2 mb-1">
              <i className="bi bi-signpost me-1"></i>
              {train.platform}
            </span>
          )}
          {train.arrival && (
            <div className="text-muted small">
              <i className="bi bi-clock me-1"></i>
              Приб. {train.arrival}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function renderFavoriteButton(stationCode, isStationFavorite, onToggleFavorite, station) {
  if (!stationCode) return null;
  
  return (
    <button 
      className={`btn ${isStationFavorite ? 'btn-danger' : 'btn-outline-danger'}`}
      onClick={() => onToggleFavorite?.(station)}
      title={isStationFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
      aria-label={isStationFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
    >
      <i className={`bi bi-heart${isStationFavorite ? '-fill' : ''}`}></i>
    </button>
  );
}
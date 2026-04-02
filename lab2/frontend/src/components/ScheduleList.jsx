import {
  renderEmptySchedule,
  renderNoTrips,
  renderRouteItem,
  renderStationItem,
  renderFavoriteButton
} from '../utils/scheduleRenderers';

export default function ScheduleList({ data, title, isFavorite, onToggleFavorite }) {
  const { station, schedule = [], segments = [] } = data || {};
  
  const isRoute = segments.length > 0;
  const items = isRoute ? segments : schedule;

  if (!items || items.length === 0) {
    return renderEmptySchedule(title);
  }

  const filteredItems = items.filter(item => {
    if (isRoute) {
      const transportType = item.transport_type || item.thread?.transport_type;
      return transportType === 'suburban' || transportType === 'train';
    }
    return item.thread?.transport_type === 'suburban';
  });

  if (filteredItems.length === 0) {
    return renderNoTrips(title);
  }

  const stationCode = !isRoute ? station?.code : null;
  const isStationFavorite = stationCode && isFavorite?.(stationCode);

  return (
    <div className="card">
      {/* Заголовок */}
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
          {renderFavoriteButton(stationCode, isStationFavorite, onToggleFavorite, station)}
        </div>
      </div>

      {/* Список рейсов */}
      <div className="list-group list-group-flush">
        {filteredItems.map((item, index) => 
          isRoute 
            ? renderRouteItem(item, index) 
            : renderStationItem(item, index)
        )}
      </div>
    </div>
  );
}
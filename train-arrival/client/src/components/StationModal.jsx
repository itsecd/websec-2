export default function StationModal({
  mode,
  selectedStation,
  onClose,
  onShowSchedule,
  onShowRoutes,
}) {
  if (!selectedStation) return null;

  return (
    <div className="station-modal">
      <div className="station-modal-head">
        <div>
          <div className="station-modal-title">{selectedStation.title}</div>
          <div className="station-modal-subtitle">
            {selectedStation.settlementTitle ||
              selectedStation.regionTitle ||
              selectedStation.countryTitle ||
              selectedStation.code}
          </div>
        </div>

        <button
          className="icon-close"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="station-modal-body">
        {mode === "station" ? (
          <button className="full-button" onClick={onShowSchedule}>
            Показать расписание станции
          </button>
        ) : (
          <button className="full-button" onClick={onShowRoutes}>
            Показать маршруты
          </button>
        )}
      </div>
    </div>
  );
}
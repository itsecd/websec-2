import NearbyStationsList from "./NearbyStationsList";

export default function RouteSheet({
  routeFrom,
  routeTo,
  date,
  setDate,
  routes,
  nearby,
  selectedStation,
  onSelectNearby,
}) {
  return (
    <div className="sheet-block">
      <div className="sheet-header">
        <h2>Маршрут между станциями</h2>
        <p>
          Выберите станции на карте или в поиске и получите список электричек
        </p>
      </div>

      <div className="route-form">
        <div className="route-field">
          <div className="route-label">Откуда</div>
          <div className="route-value">
            {routeFrom
              ? `${routeFrom.title} (${routeFrom.code})`
              : "Не выбрано"}
          </div>
        </div>

        <div className="route-field">
          <div className="route-label">Куда</div>
          <div className="route-value">
            {routeTo
              ? `${routeTo.title} (${routeTo.code})`
              : "Не выбрано"}
          </div>
        </div>

        <div className="route-field">
          <div className="route-label">Дата</div>
          <div className="route-input-wrap">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {routes ? (
        routes.segments?.length ? (
          <div className="schedule-scroll">
            <div className="result-section">
              <h3>Найденные маршруты</h3>
              <div className="cards">
                {routes.segments.map((seg, index) => (
                  <article className="card" key={`seg-${seg.uid || index}`}>
                    <h3>{seg.title || "Маршрут"}</h3>
                    <p><strong>Отправление:</strong> {seg.departure || "—"}</p>
                    <p><strong>Прибытие:</strong> {seg.arrival || "—"}</p>
                    <p><strong>Номер:</strong> {seg.number || "—"}</p>
                    <p><strong>Перевозчик:</strong> {seg.carrier || "—"}</p>
                    <p><strong>Станции:</strong> {seg.fromTitle} → {seg.toTitle}</p>
                    <p><strong>Пересадки:</strong> {seg.hasTransfers ? "есть" : "нет"}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty">Маршрутов на выбранную дату не найдено</div>
        )
      ) : (
        <div className="result-section">
          <h3>Ближайшие станции</h3>
          <div className="list list-nearby">
            <NearbyStationsList
              nearby={nearby}
              selectedStation={selectedStation}
              onSelect={onSelectNearby}
            />
          </div>
        </div>
      )}
    </div>
  );
}
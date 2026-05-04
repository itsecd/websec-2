import NearbyStationsList from "./NearbyStationsList";

export default function StationScheduleSheet({
  schedule,
  selectedStation,
  nearby,
  onSelectNearby,
}) {
  if (!schedule) {
    return (
      <div className="sheet-block">
        <div className="sheet-header">
          <h2>Расписание по станции</h2>
          <p>
            Выберите станцию на карте или через поиск, затем откройте расписание
          </p>
        </div>

        {selectedStation ? (
          <div className="selected-box">
            <div className="selected-title">{selectedStation.title}</div>
            <div className="selected-subtitle">{selectedStation.code}</div>
          </div>
        ) : (
          <div className="empty">Станция пока не выбрана</div>
        )}

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
      </div>
    );
  }

  return (
    <div className="sheet-block">
      <div className="sheet-header">
        <h2>Расписание по станции</h2>
        <p>{schedule.station?.title || selectedStation?.title}</p>
      </div>

      <div className="schedule-scroll">
        <div className="result-section">
          <h3>Отправление</h3>
          <div className="cards">
            {schedule.departure?.length ? (
              schedule.departure.map((item, index) => (
                <article
                  className="card"
                  key={`dep-${item.uid || index}`}
                >
                  <h3>{item.title || "Электричка"}</h3>
                  <p><strong>Номер:</strong> {item.number || "—"}</p>
                  <p><strong>Направление:</strong> {item.direction || "—"}</p>
                  <p><strong>Отправление:</strong> {item.departure || "—"}</p>
                  <p><strong>Прибытие:</strong> {item.arrival || "—"}</p>
                  <p><strong>Платформа:</strong> {item.platform || "—"}</p>
                  <p><strong>Дни:</strong> {item.days || "—"}</p>
                  <p><strong>Перевозчик:</strong> {item.carrier || "—"}</p>
                </article>
              ))
            ) : (
              <div className="empty">Нет отправлений на выбранную дату</div>
            )}
          </div>
        </div>

        <div className="result-section">
          <h3>Прибытие</h3>
          <div className="cards">
            {schedule.arrival?.length ? (
              schedule.arrival.map((item, index) => (
                <article
                  className="card"
                  key={`arr-${item.uid || index}`}
                >
                  <h3>{item.title || "Электричка"}</h3>
                  <p><strong>Номер:</strong> {item.number || "—"}</p>
                  <p><strong>Направление:</strong> {item.direction || "—"}</p>
                  <p><strong>Прибытие:</strong> {item.arrival || "—"}</p>
                  <p><strong>Отправление:</strong> {item.departure || "—"}</p>
                  <p><strong>Платформа:</strong> {item.platform || "—"}</p>
                  <p><strong>Дни:</strong> {item.days || "—"}</p>
                  <p><strong>Перевозчик:</strong> {item.carrier || "—"}</p>
                </article>
              ))
            ) : (
              <div className="empty">Нет прибытий на выбранную дату</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// NearbyStationsList.jsx
export default function NearbyStationsList({
  nearby,
  selectedStation,
  onSelect,
  emptyHint = "Нажмите по карте, чтобы увидеть ближайшие станции",
}) {
  if (!nearby.length) {
    return <div className="empty small">{emptyHint}</div>;
  }

  return (
    <>
      {nearby.map((st) => (
        <button
          key={st.code}
          className={`list-item ${
            selectedStation?.code === st.code ? "active" : ""
          }`}
          onClick={() => onSelect(st)}
        >
          <span className="list-title">{st.title}</span>
          <span className="list-subtitle">
            {st.distance ? `${st.distance.toFixed(2)} км` : "Станция рядом"}
          </span>
        </button>
      ))}
    </>
  );
}
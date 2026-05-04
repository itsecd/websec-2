// SearchResultsList.jsx
export default function SearchResultsList({
  searchQuery,
  searchResults,
  selectedStation,
  onSelect,
}) {
  const trimmed = searchQuery.trim();

  if (!trimmed) {
    return null;
  }

  if (!searchResults.length) {
    return <div className="empty small">Ничего не найдено</div>;
  }

  return (
    <>
      {searchResults.map((st) => (
        <button
          key={`search-${st.code}`}
          className={`list-item ${
            selectedStation?.code === st.code ? "active" : ""
          }`}
          onClick={() => onSelect(st)}
        >
          <span className="list-title">{st.title}</span>
          <span className="list-subtitle">
            {st.settlementTitle || st.regionTitle || st.countryTitle}
          </span>
        </button>
      ))}
    </>
  );
}
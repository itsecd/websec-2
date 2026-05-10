import { useMemo, useState } from "react";

export default function SearchBar({ settlements = [], onSelect }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];

    return settlements
      .filter(
        (s) =>
          s.name &&
          s.name.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10);
  }, [settlements, query]);

  return (
    <div
      style={{
        width: "100%",
        marginBottom: "10px",
        position: "relative",
      }}
    >
      <input
        type="text"
        placeholder="Введите название населённого пункта"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        style={{
          width: "100%",
          padding: "12px 14px",
          fontSize: "16px",
          boxSizing: "border-box",
          border: "1px solid #ccc",
          borderRadius: "12px",
          outline: "none",
          background: "white",
        }}
      />

      {isOpen && query.trim() && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "6px",
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "12px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
            maxHeight: "260px",
            overflowY: "auto",
            zIndex: 3000,
          }}
        >
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <div
                key={`${item.name}-${item.lat}-${item.lon}`}
                onMouseDown={() => {
                  onSelect(item);
                  setQuery(item.name);
                  setIsOpen(false);
                }}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
              >
                <div style={{ fontWeight: "600" }}>{item.name}</div>
                <div style={{ fontSize: "13px", color: "#666" }}>
                  {item.region} · население: {item.population.toLocaleString("ru-RU")}
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                padding: "10px 12px",
                color: "#666",
              }}
            >
              Ничего не найдено
            </div>
          )}
        </div>
      )}
    </div>
  );
}
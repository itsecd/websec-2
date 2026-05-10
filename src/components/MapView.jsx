import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

function FlyToSelected({ selectedSettlement }) {
  const map = useMap();

  useEffect(() => {
    if (selectedSettlement) {
      map.flyTo([selectedSettlement.lat, selectedSettlement.lon], 8, {
        duration: 1.5,
      });
    }
  }, [selectedSettlement, map]);

  return null;
}

function FixMapSize() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map]);

  return null;
}

export default function MapView({ settlements = [], selectedSettlement, onSelect }) {
  return (
    <div
      style={{
        width: "100%",
        height: "500px",
        border: "2px solid #ccc",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={[61, 90]}
        zoom={3}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FixMapSize />
        <FlyToSelected selectedSettlement={selectedSettlement} />

        {settlements.map((item) => (
          <CircleMarker
            key={`${item.name}-${item.lat}-${item.lon}`}
            center={[item.lat, item.lon]}
            radius={4}
            eventHandlers={{
              click: () => onSelect(item),
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
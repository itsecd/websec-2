"use client";

import "leaflet/dist/leaflet.css";
import { Box } from "@mui/material";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { StationSearchItem } from "@/lib/types";

type StationMapProps = {
  center: [number, number];
  nearbyStations?: StationSearchItem[];
  selectedStation: StationSearchItem | null;
  onPointSelect: (point: [number, number]) => void;
  onStationSelect: (station: StationSearchItem) => void;
};

const selectedIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export function StationMap({
  center,
  nearbyStations = [],
  selectedStation,
  onPointSelect,
  onStationSelect
}: StationMapProps) {
  return (
    <Box sx={{ height: 360, overflow: "hidden", borderRadius: 4 }}>
      <MapContainer center={center} zoom={Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM ?? 11)} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport center={center} />
        <MapClickHandler onPointSelect={onPointSelect} />
        {nearbyStations.map((station) =>
          station.latitude !== null && station.longitude !== null ? (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              {...(selectedStation?.id === station.id ? { icon: selectedIcon } : {})}
              eventHandlers={{
                click: () => onStationSelect(station)
              }}
            >
              <Popup>{station.title}</Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
    </Box>
  );
}

type MapClickHandlerProps = {
  onPointSelect: (point: [number, number]) => void;
};

function MapClickHandler({ onPointSelect }: MapClickHandlerProps) {
  useMapEvents({
    click(event) {
      onPointSelect([event.latlng.lat, event.latlng.lng]);
    }
  });

  return null;
}

type MapViewportProps = {
  center: [number, number];
};

function MapViewport({ center }: MapViewportProps) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center, map]);

  return null;
}

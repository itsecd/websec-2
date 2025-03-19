import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css"; 
import { Title, Box } from "@mantine/core";

export default function Map() {
  const position = [55.7558, 37.6173];

  return (
    <Box p="md">
      <Title order={2} mb="md">
        Карта станций
      </Title>
      <MapContainer center={position} zoom={13} style={{ height: "400px", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={position}>
          <Popup>test</Popup>
        </Marker>
      </MapContainer>
    </Box>
  );
}
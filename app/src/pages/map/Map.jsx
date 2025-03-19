import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Title, Box, Switch, Group, Button } from "@mantine/core";
import { useNavigate } from "react-router-dom"; 
import { defaultPosition, stationIcon, userIcon } from "../../utils/сonstants/for-map";
import { haversineDistance } from "../../utils/functions/for-map";
import MapController from "../../components/map-controller/MapController";


export default function Map({ stations, loading, error }) {
  const [userPosition, setUserPosition] = useState(null); 
  const [showMoreStations, setShowMoreStations] = useState(false); 
  const [visibleStations, setVisibleStations] = useState([]); 
  console.log(stations)
  const navigate = useNavigate(); 

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserPosition([latitude, longitude]);
        },
        (err) => {
          console.error("Ошибка получения геопозиции:", err.message);
        }
      );
    } else {
      console.error("Geolocation API не поддерживается в этом браузере");
    }
  }, []);

  const nearbyStations = useMemo(() => {
    if (!userPosition || !stations.length) return [];
    return stations
      .filter((station) => {
        const distance = haversineDistance(userPosition, [station.latitude, station.longitude]);
        return distance <= 50; 
      })
      .slice(0, 50); 
  }, [userPosition, stations]);

  const handleBoundsChange = (bounds) => {
    if (!showMoreStations) return;

    const filteredStations = stations
      .filter((station) => {
        const lat = station.latitude;
        const lng = station.longitude;
        return (
          lat >= bounds.getSouth() &&
          lat <= bounds.getNorth() &&
          lng >= bounds.getWest() &&
          lng <= bounds.getEast()
        );
      })
      .slice(0, 100);

    setVisibleStations(filteredStations);
  };

  useEffect(() => {
    if (!showMoreStations) {
      setVisibleStations(nearbyStations);
    }
  }, [nearbyStations, showMoreStations]);

  const handleSelectStation = (station) => {
    navigate(`/schedule/${station.code}`);
  };

  return (
    <Box p="md">
      <Title order={2} mb="md">
        Карта станций
      </Title>

      <Group mb="md">
        <Switch
          label="Показать больше станций"
          checked={showMoreStations}
          onChange={(event) => setShowMoreStations(event.currentTarget.checked)}
          color="gray"
        />
      </Group>

      {error && <p style={{ color: "red" }}>Ошибка загрузки станций: {error}</p>}
      {loading && <p>Загрузка станций...</p>}

      <MapContainer
        center={defaultPosition}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapController userPosition={userPosition} onBoundsChange={handleBoundsChange} />

        {userPosition && (
          <Marker position={userPosition} icon={userIcon}>
            <Popup>Вы здесь</Popup>
          </Marker>
        )}

        {visibleStations.map((station) => (
          <Marker
            key={station.code}
            position={[station.latitude, station.longitude]}
            icon={stationIcon}
          >
            <Popup>
              <div>
                <div>{station.title}</div>
                <Button
                  variant="outline"
                  color="gray"
                  size="xs"
                  onClick={() => handleSelectStation(station)}
                  style={{ marginTop: "8px" }}
                >
                  Выбрать
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  );
}
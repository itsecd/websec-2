import { Container, Title, Drawer, Button } from "@mantine/core";
import { FaMap } from "react-icons/fa"; 
import StationSearch from "../../components/station-search/StationSearch";
import Map from "../../pages/map/Map"; 
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Home() {
  const navigate = useNavigate();
  const [isMapOpen, setIsMapOpen] = useState(false); 
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const handleSearchSelect = (station) => {
    navigate(`/schedule/${station.code}`);
  };

  return (
    <Container size="md">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
        <Title order={1} my="lg">
          Поиск ЖД станций
        </Title>
        <Button variant="light">
            <FaMap
            size={24}
            style={{ cursor: "pointer", color: "#666" }}
            onClick={() => setIsMapOpen(true)} 
            />
        </Button>
      </div>

      <StationSearch 
        onSelect={handleSearchSelect} 
        setStations={setStations}
        setLoading={setLoading}
        setError={setError}
    />

      <Drawer
        opened={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        position="left"
        size="lg"
        title="Карта"
        overlayProps={{ opacity: 0.5, blur: 2 }}
      >
        <Map stations={stations} loading={loading} error={error}/>
      </Drawer>
    </Container>
  );
}
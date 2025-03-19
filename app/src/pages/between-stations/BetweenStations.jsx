import { useState } from "react";
import { Title, Box, Loader, Table, Text, Container } from "@mantine/core";
import { useBetweenStations } from "../../hooks/useBetweenStations";
import { useStations } from "../../hooks/useStations";
import CustomSelect from "../../components/custom-select/CustomSelect";
import styles from "./BetweenStations.module.scss";


export default function BetweenStations() {
    // станции отправления
  const [fromStation, setFromStation] = useState(null); 
  //станции прибытия
  const [toStation, setToStation] = useState(null); 
  const { stations, loading: stationsLoading, error: stationsError } = useStations("", "Россия");
  const { trips, loading: tripsLoading, error: tripsError } = useBetweenStations(fromStation, toStation);

  const stationOptions = stations.map((station) => ({
    value: station.code,
    label: station.title,
  }));

  return (
    <Container size="md" p="md">
      <Title order={1} align="center" my="lg">
        Расписание рейсов между станциями
      </Title>

      {stationsLoading && (
        <Box style={{ textAlign: "center", marginBottom: "20px" }}>
          <Loader size="md" />
          <Text size="sm" color="dimmed" mt="sm">
            Загрузка станций...
          </Text>
        </Box>
      )}

      {!stationsLoading && (
        <Box mb="lg">
          <CustomSelect
            label="Станция отправления"
            placeholder="Выберите станцию отправления"
            value={fromStation}
            onChange={setFromStation}
            data={stationOptions} 
            searchable
            clearable
            mb="md"
            style={{ width: "100%" }} 
          />

          <CustomSelect
            label="Станция прибытия"
            placeholder="Выберите станцию прибытия"
            value={toStation}
            onChange={setToStation}
            data={stationOptions} 
            searchable
            clearable
            disabled={!fromStation} 
            style={{ width: "100%" }}
          />
        </Box>
      )}

      {stationsError && <Text color="red" align="center">{stationsError}</Text>}

      {tripsLoading && <Loader size="sm" style={{ display: "block", margin: "0 auto" }} />}

      {tripsError && <Text color="red" align="center">{tripsError}</Text>}

      {trips.length > 0 && !tripsLoading && (
        <Table striped highlightOnHover className={styles.table}>
          <thead>
            <tr>
              <th>Номер рейса</th>
              <th>Название</th>
              <th>Откуда</th>
              <th>Куда</th>
              <th>Отправление</th>
              <th>Прибытие</th>
              <th>Длительность (мин)</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip, index) => (
              <tr key={index}>
                <td>{trip.thread.number}</td>
                <td>{trip.thread.title}</td>
                <td>{trip.from}</td>
                <td>{trip.to}</td>
                <td>{new Date(trip.departure).toLocaleString()}</td>
                <td>{new Date(trip.arrival).toLocaleString()}</td>
                <td>{Math.round(trip.duration / 60)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {!trips.length && !tripsLoading && !tripsError && fromStation && toStation && (
        <Text align="center">Рейсы между станциями не найдены.</Text>
      )}
    </Container>
  );
}
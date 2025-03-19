import { useParams } from "react-router-dom";
import { Loader, Table, Title } from "@mantine/core";
import { useStationSchedule } from "../../hooks/useStationSchedule";
import styles from "./Schedule.module.scss";

export default function Schedule() {
  const { code } = useParams();
//   console.log("stationCode in Schedule:", code); 
  const { schedules, loading, error } = useStationSchedule(code); 

  return (
    <div>
      <Title order={1} align="center" my="lg">
        Расписание рейсов по станции
      </Title>

      {loading && <Loader size="sm" style={{ display: "block", margin: "0 auto" }} />}

      {error && <p style={{ color: "red", textAlign: "center" }}>Ошибка: {error}</p>}

      {schedules.length > 0 && !loading && (
        <Table striped highlightOnHover className={styles.table}>
          <thead>
            <tr>
              <th>Номер рейса</th>
              <th>Название</th>
              <th>Отправление</th>
              <th>Прибытие</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s, index) => (
              <tr key={index}>
                <td>{s.thread.number}</td>
                <td>{s.thread.title}</td>
                <td>{new Date(s.departure).toLocaleString()}</td>
                <td>{s.arrival ? new Date(s.arrival).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {!schedules.length && !loading && !error && (
        <p style={{ textAlign: "center" }}>Расписание не найдено.</p>
      )}
    </div>
  );
}
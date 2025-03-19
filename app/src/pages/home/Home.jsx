import { useStations } from "../../hooks/useStations";

export default function Home() {
  const q = "Сов"; // Запрос для поиска станций, начинающихся на "Сов"
  const { stations, loading, error } = useStations(q);

  // Логируем станции для отладки
  console.log('Станции:', stations);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div>
      <h1>Список станций</h1>
      <ul>
        {stations.map((station) => (
          <li key={station.code}>{station.title}</li>
        ))}
      </ul>
    </div>
  );
};

 
import { TextInput, Select, Loader, Table, Pagination, Button } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useStations } from "../../hooks/useStations";
import { useState } from "react";
import styles from "./StationSearch.module.scss";

export default function StationSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, 300);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const stationsPerPage = 10;

  const { stations, loading, error } = useStations(debouncedQuery, selectedCountry);

  const totalPages = Math.ceil(stations.length / stationsPerPage);

  const paginatedStations = stations.slice(
    (currentPage - 1) * stationsPerPage,
    currentPage * stationsPerPage
  );

  return (
    <div>
      <Select
        value={selectedCountry}
        onChange={setSelectedCountry}
        data={[
          { value: "Россия", label: "Россия" },
          { value: "Беларусь", label: "Беларусь" },
        ]}
        placeholder="Выберите страну"
        mb="sm"
        searchable
        clearable
        disabled={loading}
      />

      <TextInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Введите название станции"
        mb="sm"
        disabled={!selectedCountry || loading}
      />

      {loading && <Loader size="sm" />}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}

      {stations.length > 0 && !loading && (
        <>
          <Table
            striped
            highlightOnHover
            className={styles.table}
          >
            <thead>
              <tr>
                <th>Название</th>
                <th>Код станции</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStations.map((s) => (
                <tr key={s.code}>
                  <td>{s.title}</td>
                  <td>{s.code}</td>
                  <td className={styles.actionCell}>
                    <Button variant="outline" color="gray" onClick={() => onSelect(s)}>
                      Выбрать
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            total={totalPages}
            value={currentPage}
            onChange={setCurrentPage}
            mt="sm"
            withEdges
            style={{ display: "flex", justifyContent: "center", width: "100%" }}
          />
        </>
      )}

      {!stations.length && !loading && query && selectedCountry && (
        <p>Станции не найдены. Попробуйте другой запрос.</p>
      )}
    </div>
  );
}
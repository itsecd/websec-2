import { TextInput, Select, Loader, Table, Pagination, Button, ActionIcon } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useStations } from "../../hooks/useStations";
import { useState } from "react";
import { BsHeart, BsHeartFill } from "react-icons/bs"; 
import styles from "./StationSearch.module.scss";

export default function StationSearch({ onSelect, setStations, setLoading, setError }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, 300);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const stationsPerPage = 10;

  const { mapStations, stations, loading, error, favoriteStations, addFavorite, removeFavorite } = useStations(
    debouncedQuery,
    selectedCountry
  );
  setStations(mapStations);
  setLoading(loading);
  setError(error);

  const totalPages = Math.ceil(stations.length / stationsPerPage);
  const paginatedStations = stations.slice(
    (currentPage - 1) * stationsPerPage,
    currentPage * stationsPerPage
  );


  const isFavorite = (stationCode) =>
    favoriteStations.some((fav) => fav.code === stationCode);

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
          <Table striped highlightOnHover className={styles.table}>
            <thead>
              <tr>
                <th>Название</th>
                <th>Код станции</th>
                <th>Избранное</th> 
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStations.map((s) => (
                <tr key={s.code}>
                  <td>{s.title}</td>
                  <td>{s.code}</td>
                  <td>
                    <ActionIcon
                      variant="subtle"
                      color={isFavorite(s.code) ? "red" : "gray"}
                      onClick={() =>
                        isFavorite(s.code) ? removeFavorite(s.code) : addFavorite(s)
                      }
                    >
                      {isFavorite(s.code) ? (
                        <BsHeartFill size={20} /> 
                      ) : (
                        <BsHeart size={20} /> 
                      )}
                    </ActionIcon>
                  </td>
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
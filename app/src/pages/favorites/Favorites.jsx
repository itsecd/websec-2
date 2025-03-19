import { useState } from "react";
import { TextInput, Table, ActionIcon, Loader, Pagination } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useStations } from "../../hooks/useStations";
import { BsHeartFill } from "react-icons/bs";
import styles from "./Favorites.module.scss";


export default function Favorites() {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const stationsPerPage = 10;

  const { favoriteStations, loading, error, removeFavorite } = useStations();

  const filteredFavorites = favoriteStations.filter((station) =>
    station.title.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredFavorites.length / stationsPerPage);
  const paginatedFavorites = filteredFavorites.slice(
    (currentPage - 1) * stationsPerPage,
    currentPage * stationsPerPage
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Избранные станции</h1>

      <TextInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по избранным станциям"
        className={styles.searchInput}
        disabled={loading}
      />

      {loading && <Loader size="sm" className={styles.loader} />}

      {error && <p className={styles.error}>Ошибка: {error}</p>}

      {filteredFavorites.length > 0 && !loading && (
        <>
          <Table striped highlightOnHover className={styles.table}>
            <thead>
              <tr>
                <th>Название</th>
                <th>Код станции</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFavorites.map((station) => (
                <tr key={station.code}>
                  <td>{station.title}</td>
                  <td>{station.code}</td>
                  <td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => removeFavorite(station.code)}
                    >
                      <BsHeartFill size={20} />
                    </ActionIcon>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <Pagination
              total={totalPages}
              value={currentPage}
              onChange={setCurrentPage}
              withEdges
              className={styles.pagination}
            />
          )}
        </>
      )}

      {!filteredFavorites.length && !loading && !debouncedQuery && (
        <p className={styles.message}>У вас нет избранных станций.</p>
      )}

      {!filteredFavorites.length && !loading && debouncedQuery && (
        <p className={styles.message}>По вашему запросу ничего не найдено в избранном.</p>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';

export const useStations = (query = '') => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { getData } = useApi();

  useEffect(() => {
    const loadStations = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = query
          ? { q: query, transport_types: 'suburban', lang: 'ru_RU', format: 'json' }
          : { transport_types: 'suburban', lang: 'ru_RU', format: 'json' };
        console.log('Запрос станций с параметрами:', params);
        const data = await getData('/stations_list/', params);
        console.log('Полученные данные:', data);
        const stationList = data.stations.map((s) => ({
          code: s.code,
          title: s.title,
          latitude: s.latitude,
          longitude: s.longitude,
        }));
        setStations(stationList);
      } catch (error) {
        console.error('Ошибка при загрузке станций:', error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadStations();
  }, [query, getData]);

  return { stations, loading, error };
};
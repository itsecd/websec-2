import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';


export const useNearbyStations = (lat, lng, distance = 50) => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getData } = useApi();

  useEffect(() => {
    if (!lat || !lng) return;

    const loadNearbyStations = async () => {
      setLoading(true);
      try {
        const data = await getData('/nearest_stations/', {
          lat,
          lng,
          distance,
          transport_types: 'suburban',
        });
        const stationList = data.stations.map((s) => ({
          code: s.code,
          title: s.title,
          latitude: s.latitude,
          longitude: s.longitude,
        }));
        setStations(stationList);
      } catch (error) {
        console.error('Ошибка при загрузке ближайших станций:', error.message);
      } finally {
        setLoading(false);
      }
    };

    loadNearbyStations();
  }, [lat, lng, distance, getData]);

  return { stations, loading };
};
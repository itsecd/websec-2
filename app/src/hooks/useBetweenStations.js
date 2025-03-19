import { useState, useEffect } from "react";
import { useApi } from "../context/ApiContext";

export const useBetweenStations = (fromStation, toStation) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { getData } = useApi();

  useEffect(() => {
    if (!fromStation || !toStation) return;

    const loadTrips = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getData("/search/", {
          from: fromStation,
          to: toStation,
          format: "json",
          lang: "ru_RU",
          date: new Date().toISOString().split("T")[0], 
          transport_types: "suburban", 
          limit: 50, 
        });

        const tripList = data.segments.map((segment) => ({
          departure: segment.departure,
          arrival: segment.arrival,
          duration: segment.duration,
          thread: {
            title: segment.thread.title,
            number: segment.thread.number,
          },
          from: segment.from.title,
          to: segment.to.title,
        }));

        setTrips(tripList);
      } catch (error) {
        console.error("Ошибка при загрузке рейсов между станциями:", error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, [fromStation, toStation, getData]);

  return { trips, loading, error };
};
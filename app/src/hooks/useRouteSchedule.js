import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';


export const useRouteSchedule = (fromCode, toCode) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getData } = useApi();

  useEffect(() => {
    if (!fromCode || !toCode) return;

    const loadRouteSchedule = async () => {
      setLoading(true);
      try {
        const data = await getData('/search/', {
          from: fromCode,
          to: toCode,
          transport_types: 'suburban',
          date: new Date().toISOString().split('T')[0],
        });
        const scheduleList = data.segments.map((s) => ({
          departure: s.departure,
          arrival: s.arrival,
          thread: {
            title: s.thread.title,
            number: s.thread.number,
          },
        }));
        setSchedules(scheduleList);
      } catch (error) {
        console.error('Ошибка при загрузке маршрута:', error.message);
      } finally {
        setLoading(false);
      }
    };

    loadRouteSchedule();
  }, [fromCode, toCode, getData]);

  return { schedules, loading };
};
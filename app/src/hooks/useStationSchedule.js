import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';


export const useStationSchedule = (stationCode) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getData } = useApi();

  useEffect(() => {
    if (!stationCode) return;

    const loadSchedule = async () => {
      setLoading(true);
      try {
        const data = await getData('/schedule/', {
          station: stationCode,
          transport_types: 'suburban',
          date: new Date().toISOString().split('T')[0], 
        });
        const scheduleList = data.schedule.map((s) => ({
          departure: s.departure,
          arrival: s.arrival || null,
          thread: {
            title: s.thread.title,
            number: s.thread.number,
          },
        }));
        setSchedules(scheduleList);
      } catch (error) {
        console.error('Ошибка при загрузке расписания станции:', error.message);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [stationCode, getData]);

  return { schedules, loading };
};
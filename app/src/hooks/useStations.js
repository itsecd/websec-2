import { useState, useEffect } from "react";
import { useApi } from "../context/ApiContext";

export const useStations = (query = "", selectedCountry = null) => {
  const [countries, setCountries] = useState([]);
  const [allStations, setAllStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { getData } = useApi();

  useEffect(() => {
    const loadStations = async () => {
      if (!selectedCountry) {
        setAllStations([]);
        setFilteredStations([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getData("/stations_list/", {
          lang: "ru_RU",
          format: "json",
        });

        const countryList = data.countries.map((country) => ({
          code: country.codes.yandex_code,
          title: country.title,
        }));
        setCountries(countryList);

        const stationList = data.countries
          .filter((country) => country.title === selectedCountry)
          .flatMap((country) =>
            country.regions.flatMap((region) =>
              region.settlements.flatMap((settlement) =>
                settlement.stations.map((s) => ({
                  country: country.title,
                  code: s.codes.yandex_code, 
                  title: `${s.title} (${settlement.title}, ${region.title})`,
                  latitude: s.latitude,
                  longitude: s.longitude,
                }))
              )
            )
          );

        setAllStations(stationList);
        setFilteredStations(stationList);
      } catch (error) {
        console.error("Ошибка при загрузке станций:", error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadStations();
  }, [selectedCountry, getData]);

  useEffect(() => {
    if (!query) {
      setFilteredStations(allStations);
    } else {
      const filtered = allStations.filter((s) =>
        s.title.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredStations(filtered);
    }
  }, [query, allStations]);

  return { countries, stations: filteredStations, loading, error };
};
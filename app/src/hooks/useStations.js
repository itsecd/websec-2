import { useState, useEffect } from "react";
import { useApi } from "../context/ApiContext";
import { openDB } from "idb";


const initDB = async () => {
  return openDB("StationsDB", 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore("stations", { keyPath: "country" });
      }
      if (oldVersion < 2) {
        db.createObjectStore("favorites", { keyPath: "code" });
      }
      if (oldVersion < 3) {
        db.createObjectStore("defaultStations", { keyPath: "id" });
      }
    },
  });
};

const extractStationsForMap = (countries) => {
  if (!countries || !Array.isArray(countries)) return [];
  return countries
    .flatMap((country) =>
      country.regions.flatMap((region) =>
        region.settlements.flatMap((settlement) =>
          settlement.stations.map((station) => ({
            code: station.codes.yandex_code,
            title: station.title,
            latitude: station.latitude,
            longitude: station.longitude,
            transport_type: station.transport_type,
            station_type: station.station_type,
          }))
        )
      )
    )
    .filter((station) => station.latitude && station.longitude); 
};

export const useStations = (query = "", selectedCountry = null) => {
  const [countries, setCountries] = useState([]);
  const [allStations, setAllStations] = useState([]);
  const [defaultAllStations, setDefaultAllStations] = useState([]);
  const [mapStations, setMapStations] = useState([]); 
  const [filteredStations, setFilteredStations] = useState([]);
  const [favoriteStations, setFavoriteStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { getData } = useApi();

  useEffect(() => {
    const loadStations = async () => {
      try {
        const db = await initDB();


        const favoriteList = await db.getAll("favorites").catch((err) => {
          console.error("Ошибка при загрузке избранных станций:", err);
          return [];
        });
        setFavoriteStations(favoriteList);

        const cachedDefaultStations = await db.get("defaultStations", "default");
        console.log("Кэшированные дефолтные станции:", cachedDefaultStations);
        if (cachedDefaultStations) {
          setDefaultAllStations(cachedDefaultStations.data);
          setMapStations(extractStationsForMap(cachedDefaultStations.data)); 
        }

        if (!selectedCountry) {
          setAllStations([]);
          setFilteredStations([]);
          return;
        }


        const cachedStations = await db.get("stations", selectedCountry);
        if (cachedStations) {
          setAllStations(cachedStations.data);
          setFilteredStations(cachedStations.data);
          return;
        }

        setLoading(true);
        setError(null);
        const data = await getData("/stations_list/", {
          lang: "ru_RU",
          format: "json",
        });
        console.log("Данные из API:", data);

        if (!data || !data.countries || !Array.isArray(data.countries)) {
          throw new Error("Данные API не содержат countries или имеют неверный формат");
        }


        if (!cachedDefaultStations) {
          await db.put("defaultStations", { id: "default", data: data.countries });
          setDefaultAllStations(data.countries);
          setMapStations(extractStationsForMap(data.countries)); 
        }

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
                  code: s.codes.yandex_code,
                  title: `${s.title} (${settlement.title}, ${region.title})`,
                }))
              )
            )
          );

        setAllStations(stationList);
        setFilteredStations(stationList);

        await db.put("stations", { country: selectedCountry, data: stationList });
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


  const addFavorite = async (station) => {
    try {
      const db = await initDB();
      await db.put("favorites", station);
      const updatedFavorites = await db.getAll("favorites");
      setFavoriteStations(updatedFavorites);
    } catch (error) {
      console.error("Ошибка при добавлении в избранное:", error.message);
    }
  };


  const removeFavorite = async (stationCode) => {
    try {
      const db = await initDB();
      await db.delete("favorites", stationCode);
      const updatedFavorites = await db.getAll("favorites");
      setFavoriteStations(updatedFavorites);
    } catch (error) {
      console.error("Ошибка при удалении из избранного:", error.message);
    }
  };

  return {
    countries,
    stations: filteredStations,
    favoriteStations,
    defaultAllStations,
    mapStations, 
    loading,
    error,
    addFavorite,
    removeFavorite,
  };
};
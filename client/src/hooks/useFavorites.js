import { useEffect, useState } from "react";
import { FAVORITES_STORAGE_KEY } from "../config/app";
import { readStoredList, writeStoredList } from "../utils/storage";

function normalizeFavorites(items) {
    return [...items].sort((leftItem, rightItem) =>
        `${leftItem.title} ${leftItem.region}`.localeCompare(
            `${rightItem.title} ${rightItem.region}`,
            "ru",
        ),
    );
}

function hasFavoriteInList(items, stationCode) {
    return items.some((station) => station.code === stationCode);
}

export function useFavorites() {
    const [favoriteStations, setFavoriteStations] = useState(() =>
        normalizeFavorites(readStoredList(FAVORITES_STORAGE_KEY)),
    );

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        function handleStorageChange(event) {
            if (event.key && event.key !== FAVORITES_STORAGE_KEY) {
                return;
            }

            setFavoriteStations(normalizeFavorites(readStoredList(FAVORITES_STORAGE_KEY)));
        }

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    function addFavorite(station) {
        setFavoriteStations((currentStations) => {
            if (hasFavoriteInList(currentStations, station.code)) {
                return currentStations;
            }

            const nextStations = normalizeFavorites([...currentStations, station]);
            writeStoredList(FAVORITES_STORAGE_KEY, nextStations);
            return nextStations;
        });
    }

    function removeFavorite(stationCode) {
        setFavoriteStations((currentStations) => {
            const nextStations = currentStations.filter((station) => station.code !== stationCode);
            writeStoredList(FAVORITES_STORAGE_KEY, nextStations);
            return nextStations;
        });
    }

    function hasFavorite(stationCode) {
        return hasFavoriteInList(favoriteStations, stationCode);
    }

    return {
        favoriteStations,
        addFavorite,
        removeFavorite,
        hasFavorite,
    };
}

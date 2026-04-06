export function formatStationLabel(station) {
    if (!station) {
        return "";
    }

    return [station.title, station.settlement, station.region].filter(Boolean).join(", ");
}

export function formatDistance(distanceKm) {
    if (!distanceKm && distanceKm !== 0) {
        return "";
    }

    return `${distanceKm.toFixed(1)} км`;
}

export function formatDuration(totalSeconds) {
    if (!totalSeconds) {
        return "—";
    }

    const totalMinutes = Math.round(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours && minutes) {
        return `${hours} ч ${minutes} мин`;
    }

    if (hours) {
        return `${hours} ч`;
    }

    return `${minutes} мин`;
}

export function formatStopsLabel(stopsText) {
    if (!stopsText) {
        return "остановки не указаны";
    }

    return stopsText;
}

export function formatTransportLabel(transportType) {
    if (!transportType) {
        return "электричка";
    }

    if (transportType === "suburban") {
        return "электричка";
    }

    if (transportType === "train") {
        return "поезд";
    }

    return transportType;
}

export function formatStationTypeLabel(stationType) {
    if (!stationType) {
        return "не указан";
    }

    const labels = {
        train_station: "вокзал",
        station: "станция",
        platform: "платформа",
        stop: "остановочный пункт",
        checkpoint: "пункт",
        post: "пост",
        crossing: "разъезд",
        overtaking_point: "обгонный пункт",
    };

    return labels[stationType] || stationType;
}

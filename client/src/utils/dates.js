export function todayDateValue() {
    return new Date().toISOString().slice(0, 10);
}

export function formatDateTime(isoString) {
    if (!isoString) {
        return "—";
    }

    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(isoString));
}

export function formatTime(isoString) {
    if (!isoString) {
        return "—";
    }

    return new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(isoString));
}

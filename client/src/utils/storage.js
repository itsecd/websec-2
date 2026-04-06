export function canUseStorage() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readStoredList(storageKey) {
    if (!canUseStorage()) {
        return [];
    }

    try {
        const rawValue = window.localStorage.getItem(storageKey);

        if (!rawValue) {
            return [];
        }

        const parsedValue = JSON.parse(rawValue);
        return Array.isArray(parsedValue) ? parsedValue : [];
    } catch (error) {
        console.error("Не удалось прочитать localStorage", error);
        return [];
    }
}

export function readStoredValue(storageKey, fallbackValue = "") {
    if (!canUseStorage()) {
        return fallbackValue;
    }

    try {
        const rawValue = window.localStorage.getItem(storageKey);
        return rawValue ?? fallbackValue;
    } catch (error) {
        console.error("Не удалось прочитать localStorage", error);
        return fallbackValue;
    }
}

export function writeStoredList(storageKey, items) {
    if (!canUseStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
        console.error("Не удалось записать localStorage", error);
    }
}

export function writeStoredValue(storageKey, value) {
    if (!canUseStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(storageKey, String(value));
    } catch (error) {
        console.error("Не удалось записать localStorage", error);
    }
}

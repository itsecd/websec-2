function getStorageSafe(storageName) {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const storage = window[storageName];
        const testKey = "__storage_test__";
        storage.setItem(testKey, testKey);
        storage.removeItem(testKey);
        return storage;
    } catch {
        return null;
    }
}

export function canUseStorage() {
    return Boolean(getStorageSafe("localStorage"));
}

export function readStoredList(storageKey) {
    const storage = getStorageSafe("localStorage");

    if (!storage) {
        return [];
    }

    try {
        const rawValue = storage.getItem(storageKey);

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
    const storage = getStorageSafe("localStorage");

    if (!storage) {
        return fallbackValue;
    }

    try {
        const rawValue = storage.getItem(storageKey);
        return rawValue ?? fallbackValue;
    } catch (error) {
        console.error("Не удалось прочитать localStorage", error);
        return fallbackValue;
    }
}

export function writeStoredList(storageKey, items) {
    const storage = getStorageSafe("localStorage");

    if (!storage) {
        return;
    }

    try {
        storage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
        console.error("Не удалось записать localStorage", error);
    }
}

export function writeStoredValue(storageKey, value) {
    const storage = getStorageSafe("localStorage");

    if (!storage) {
        return;
    }

    try {
        storage.setItem(storageKey, String(value));
    } catch (error) {
        console.error("Не удалось записать localStorage", error);
    }
}

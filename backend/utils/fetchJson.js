export function createHttpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

export async function fetchJson(url, requestLabel, options = {}) {
    let response;

    try {
        response = await fetch(url, options);
    } catch (error) {
        console.error(`[${requestLabel}] network error`, error);
        throw createHttpError(502, "Не удалось связаться с API Яндекс.Расписаний.");
    }

    const responseText = await response.text();

    if (!response.ok) {
        console.error(`[${requestLabel}] bad response`, response.status, responseText);
        throw createHttpError(
            response.status,
            "Яндекс.Расписания вернули ошибку. Проверьте ключ и параметры запроса.",
        );
    }

    if (!responseText) {
        return null;
    }

    try {
        return JSON.parse(responseText);
    } catch (error) {
        console.error(`[${requestLabel}] invalid json`, error, responseText);
        throw createHttpError(502, "API Яндекс.Расписаний вернуло некорректный JSON.");
    }
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5001/api';

async function sendRequest(
  url,
  {
    method = 'GET',
    queryParams = {},
    bodyParams = null,
    headers = {},
  } = {}
) {
  const queryString = new URLSearchParams();

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryString.append(key, String(value));
    }
  });

  const fullUrl = `${API_BASE}${url}${
    queryString.toString() ? `?${queryString.toString()}` : ''
  }`;

  const options = {
    method,
    headers: {
      ...headers,
    },
  };

  if (bodyParams && method !== 'GET') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(bodyParams);
  }

  const res = await fetch(fullUrl, options);

  if (!res.ok) {
    let errorMessage = `Request failed: ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // если тело ошибки не JSON — оставляем стандартное сообщение
    }
    throw new Error(errorMessage);
  }

  return await res.json();
}

export async function getStations() {
  const data = await sendRequest('/stations');
  return data.stations || [];
}

export async function searchStations(query) {
  const data = await sendRequest('/stations/search', {
    queryParams: { q: query },
  });
  return data.stations || [];
}

export async function getNearbyStations(lat, lng) {
  const data = await sendRequest('/stations/near', {
    queryParams: { lat, lng },
  });
  return data.stations || [];
}

export async function getStationSchedule(code, date) {
  return await sendRequest(`/stations/${encodeURIComponent(code)}/schedule`, {
    queryParams: { date },
  });
}

export async function searchRoutes(from, to, date, transfers = false) {
  return await sendRequest('/routes/search', {
    queryParams: { from, to, date, transfers },
  });
}
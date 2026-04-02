const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error: ${response.status}`);
  }
  
  if (response.status === 204) {
    return {};
  }
  
  return response.json();
}

export const stationAPI = {
  search: (text) => {
    const query = encodeURIComponent(text);
    return request(`/stations/search?text=${query}`);
  },
  
  nearby: (lat, lng, distance = 50, limit = 50) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      distance: distance.toString(),
      limit: limit.toString()
    });
    return request(`/stations/nearby?${params}`);
  },
  
  getSchedule: (stationCode, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/schedule/station/${stationCode}${qs ? '?' + qs : ''}`);
  },
  
  getRoute: (fromCode, toCode, params = {}) => {
    const qs = new URLSearchParams({
      from_code: fromCode,
      to_code: toCode,
      ...params
    }).toString();
    return request(`/schedule/route?${qs}`);
  },
  
  loadCache: () => request('/cache/load', { method: 'POST' })
};

export const favoritesAPI = {
  getAll: () => request('/favorites'),
  add: (code) => request(`/favorites/${code}`, { method: 'POST' }),
  remove: (code) => request(`/favorites/${code}`, { method: 'DELETE' })
};

export default request;
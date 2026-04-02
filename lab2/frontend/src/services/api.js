import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

export const stationAPI = {
  search: (text) => api.get('/stations/search', { params: { text } }),
  
  nearby: (lat, lng, distance = 50) => 
    api.get('/stations/nearby', { params: { lat, lng, distance } }),
  
  getSchedule: (stationCode, params = {}) => 
    api.get(`/schedule/station/${stationCode}`, { params }),
  
  getRoute: (fromCode, toCode, params = {}) => 
    api.get('/schedule/route', { params: { from_code: fromCode, to_code: toCode, ...params } })
};

export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
  add: (code) => api.post(`/favorites/${code}`),
  remove: (code) => api.delete(`/favorites/${code}`)
};

export default api;
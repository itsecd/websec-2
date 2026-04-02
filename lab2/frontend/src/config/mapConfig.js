export const DEFAULT_MAP_CENTER = {
  lng: 37.6173,
  lat: 55.7558,
  label: 'Москва, Красная площадь'
};

export const MAP_SEARCH_PARAMS = {
  initial: {
    distance: 30, 
    limit: 30      
  },
  click: {
    distance: 50,  
    limit: 30      
  }
};

export const MAP_VIEW_CONFIG = {
  defaultZoom: 10,
  minZoom: 5,
  maxZoom: 18
};

export const LAYER_NAMES = {
  stations: 'stations-layer',
  route: 'route-layer',
  userLocation: 'user-location-layer'
};
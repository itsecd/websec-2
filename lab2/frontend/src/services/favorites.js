const FAVORITES_KEY = 'pribyvalka_favorites'; // думаю оставить, так как этот параметр не зависит от окружения

export const favoritesService = {

  getAll() {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  isFavorite(code) {
    return this.getAll().some(s => s.code === code);
  },

  add(station) {
    try {
      if (this.isFavorite(station.code)) {
        return false; // Уже в избранном
      }
      
      const favorites = this.getAll();
      favorites.push({
        code: station.code,
        title: station.title,
        short_title: station.short_title,
        station_type: station.station_type,
        direction: station.direction,
        latitude: station.latitude,
        longitude: station.longitude
      });
      
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return true;
    } catch {
      return false;
    }
  },

  remove(code) {
    try {
      const favorites = this.getAll().filter(s => s.code !== code);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return true;
    } catch {
      return false;
    }
  }
};
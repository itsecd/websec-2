const FAVORITES_KEY = 'pribyvalka_favorites';

export const favoritesService = {
  getAll() {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  add(station) {
    const favorites = this.getAll();
    if (!favorites.find(s => s.code === station.code)) {
      favorites.push(station);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return true;
    }
    return false;
  },

  remove(code) {
    const favorites = this.getAll().filter(s => s.code !== code);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return true;
  },

  isFavorite(code) {
    return this.getAll().some(s => s.code === code);
  }
};
import { favoritesService } from '../services/favorites';

export default function FavoritesList({ favorites, onSelectStation, onRemove }) {
  
  const handleRemove = (code) => {
    favoritesService.remove(code);
    
    if (onRemove) onRemove(code);
  };

  if (!favorites || favorites.length === 0) {
    return (
      <div className="card">
        <h3 className="h5 mb-3">
          <i className="bi bi-heart me-2"></i>
          Избранные станции
        </h3>
        <p className="text-muted text-center py-4">
          <i className="bi bi-heart display-6 d-block mb-2"></i>
          Здесь будут ваши избранные станции
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="h5 mb-3">
        <i className="bi bi-heart-fill text-danger me-2"></i>
        Избранные станции ({favorites.length})
      </h3>
      <div className="list-group list-group-flush">
        {favorites.map((station) => (
          <div key={station.code} className="list-group-item d-flex justify-content-between align-items-center">
            <button 
              className="text-start flex-grow-1 text-decoration-none"
              onClick={() => onSelectStation?.(station)}
            >
              <div className="fw-medium">{station.title}</div>
              <div className="text-muted small">
                {station.direction && `${station.direction} направление`}
              </div>
            </button>
            <button 
              className="btn btn-outline-danger btn-sm"
              onClick={() => handleRemove(station.code)}
              aria-label="Удалить из избранного"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
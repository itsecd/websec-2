export function FavoriteButton({ active, onClick }) {
    return (
        <button
            type="button"
            className={`favorite-button ${active ? "is-active" : ""}`}
            onClick={onClick}
        >
            <span className="favorite-button__icon" aria-hidden="true">
                {active ? "★" : "☆"}
            </span>
            <span className="favorite-button__text">{active ? "В избранном" : "В избранное"}</span>
        </button>
    );
}

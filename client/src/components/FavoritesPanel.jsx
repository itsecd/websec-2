import { formatStationLabel } from "../utils/formatters";
import { EmptyState } from "./EmptyState";

export function FavoritesPanel({
    favoriteStations,
    onPickStation,
    onRemoveFavorite,
    onUseAsRouteFrom,
    onUseAsRouteTo,
    selectedStationCode,
}) {
    function renderEmptyState() {
        return (
            <EmptyState
                title="Пока пусто"
                text="Добавьте станцию из поиска, и она появится здесь."
            />
        );
    }

    function renderFavoriteList() {
        return (
            <div className="favorites-list">
                {favoriteStations.map((station) => (
                    <article
                        key={station.code}
                        className={`favorite-card ${selectedStationCode === station.code ? "is-current" : ""}`}
                    >
                        <div>
                            <h3>{station.title}</h3>
                            <p>{formatStationLabel(station)}</p>
                        </div>
                        <div className="favorite-card__actions">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => onPickStation(station)}
                            >
                                Открыть
                            </button>
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => onUseAsRouteFrom(station)}
                            >
                                Откуда
                            </button>
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => onUseAsRouteTo(station)}
                            >
                                Куда
                            </button>
                            <button
                                type="button"
                                className="secondary-button secondary-button--danger"
                                onClick={() => onRemoveFavorite(station.code)}
                            >
                                Убрать
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        );
    }

    return (
        <section id="favorites-panel" className="panel panel--compact panel--favorites">
            <div className="favorites-head">
                <div>
                    <p className="section-kicker">Избранное</p>
                    <h2>Сохранённые станции</h2>
                    <p className="favorites-text">Список станций, которые вы открываете чаще.</p>
                </div>
                <span className="favorites-count">{favoriteStations.length}</span>
            </div>
            {favoriteStations.length === 0 ? renderEmptyState() : renderFavoriteList()}
        </section>
    );
}

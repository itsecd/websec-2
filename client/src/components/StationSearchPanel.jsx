import { MAP_POINT_SEARCH_DISTANCE } from "../config/map";
import {
    formatDistance,
    formatStationLabel,
    formatStationTypeLabel,
    formatTransportLabel,
} from "../utils/formatters";
import { EmptyState } from "./EmptyState";
import { LoadingBlock } from "./LoadingBlock";
import { StationAutocomplete } from "./StationAutocomplete";
import { StationMap } from "./StationMap";

function FavoriteButton({ active, onClick }) {
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

export function StationSearchPanel({
    selectedStation,
    onStationSelect,
    onFavoriteToggle,
    isFavorite,
    onMapPointPick,
    pickedPoint,
    nearbyStations,
    nearbyStationsLoading,
    nearbyStationsError,
}) {
    return (
        <section id="station-panel" className="panel">
            <div className="panel__heading">
                <div>
                    <p className="section-kicker">Поиск станции</p>
                    <h2>Выберите станцию по названию или по карте</h2>
                </div>
                {selectedStation ? (
                    <FavoriteButton
                        active={isFavorite(selectedStation.code)}
                        onClick={() => onFavoriteToggle(selectedStation)}
                    />
                ) : null}
            </div>

            <div className="panel-grid">
                <div className="panel-card">
                    <StationAutocomplete
                        label="Название станции"
                        inputId="station-search"
                        placeholder="Например, Самара, Пятилетка или Безымянка"
                        selectedStation={selectedStation}
                        onSelect={onStationSelect}
                    />

                    {selectedStation ? (
                        <article className="station-summary">
                            <header className="station-summary__header">
                                <h3>{selectedStation.title}</h3>
                                <p>{formatStationLabel(selectedStation)}</p>
                            </header>
                            <dl className="station-summary__meta">
                                <div>
                                    <dt>Код станции</dt>
                                    <dd>{selectedStation.code}</dd>
                                </div>
                                <div>
                                    <dt>Тип</dt>
                                    <dd>{formatStationTypeLabel(selectedStation.stationType)}</dd>
                                </div>
                                <div>
                                    <dt>Транспорт</dt>
                                    <dd>{formatTransportLabel(selectedStation.transportType)}</dd>
                                </div>
                            </dl>
                        </article>
                    ) : (
                        <EmptyState
                            title="Станция не выбрана"
                            text="Введите название станции или кликните по карте."
                        />
                    )}
                </div>

                <div className="panel-card">
                    <div className="map-note">
                        <p>
                            Клик по карте ищет ближайшие станции в радиусе{" "}
                            {MAP_POINT_SEARCH_DISTANCE} км.
                        </p>
                    </div>
                    <StationMap
                        nearbyStations={nearbyStations}
                        selectedStation={selectedStation}
                        pickedPoint={pickedPoint}
                        onMapPointPick={onMapPointPick}
                    />

                    {nearbyStationsLoading ? <LoadingBlock text="Ищу станции рядом..." /> : null}
                    {nearbyStationsError ? (
                        <p className="field-error">{nearbyStationsError}</p>
                    ) : null}
                    {!nearbyStationsLoading &&
                    !nearbyStationsError &&
                    pickedPoint &&
                    nearbyStations.length === 0 ? (
                        <EmptyState
                            title="Ничего не найдено"
                            text="Кликните по другой точке карты."
                        />
                    ) : null}

                    {nearbyStations.length > 0 ? (
                        <div className="nearby-list">
                            {nearbyStations.map((station) => (
                                <button
                                    type="button"
                                    key={station.code}
                                    className={`nearby-list__item ${
                                        station.code === selectedStation?.code ? "is-selected" : ""
                                    }`}
                                    onClick={() => onStationSelect(station)}
                                >
                                    <strong>{station.title}</strong>
                                    <span>
                                        {station.stationTypeName ||
                                            formatStationTypeLabel(station.stationType)}
                                    </span>
                                    <span>{formatDistance(station.distance)}</span>
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

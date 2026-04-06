import { formatDateTime } from "../utils/dates";
import { formatDuration, formatStopsLabel, formatTransportLabel } from "../utils/formatters";
import { EmptyState } from "./EmptyState";
import { LoadingBlock } from "./LoadingBlock";
import { StationAutocomplete } from "./StationAutocomplete";

function RouteCard({ segment }) {
    return (
        <article className="route-card">
            <header className="route-card__header">
                <div>
                    <h3>{segment.thread.shortTitle || segment.thread.title}</h3>
                    <p>
                        {segment.thread.number ? `№ ${segment.thread.number}` : "Без номера"}
                        {segment.thread.transportSubtype
                            ? ` • ${segment.thread.transportSubtype}`
                            : ""}
                        {segment.hasTransfers ? " • с пересадками" : " • прямой"}
                    </p>
                </div>
                <div className="route-card__badges">
                    {segment.ticketText ? (
                        <span className="route-card__badge route-card__badge--price">
                            {segment.ticketText}
                        </span>
                    ) : null}
                    {segment.isInterval ? (
                        <span className="route-card__badge route-card__badge--interval">
                            интервальный
                        </span>
                    ) : null}
                </div>
            </header>

            <div className="route-card__timeline">
                <div>
                    <strong>{segment.from.title}</strong>
                    <span>{formatDateTime(segment.departure)}</span>
                    <small>
                        {segment.departurePlatform
                            ? `платформа ${segment.departurePlatform}`
                            : "платформа не указана"}
                    </small>
                </div>
                <div className="route-card__duration">{formatDuration(segment.duration)}</div>
                <div>
                    <strong>{segment.to.title}</strong>
                    <span>{formatDateTime(segment.arrival)}</span>
                    <small>
                        {segment.arrivalPlatform
                            ? `платформа ${segment.arrivalPlatform}`
                            : "платформа не указана"}
                    </small>
                </div>
            </div>

            <dl className="route-card__meta">
                <div>
                    <dt>Перевозчик</dt>
                    <dd>{segment.thread.carrier || "не указан"}</dd>
                </div>
                <div>
                    <dt>Остановки</dt>
                    <dd>{formatStopsLabel(segment.stops)}</dd>
                </div>
                <div>
                    <dt>Дни следования</dt>
                    <dd>{segment.days || segment.thread.intervalDensity || "нет данных"}</dd>
                </div>
                <div>
                    <dt>Транспорт</dt>
                    <dd>
                        {segment.thread.vehicle ||
                            formatTransportLabel(segment.thread.transportType)}
                    </dd>
                </div>
            </dl>
        </article>
    );
}

export function RouteSearchPanel({
    fromStation,
    toStation,
    selectedDate,
    onFromStationSelect,
    onToStationSelect,
    onDateChange,
    onSubmit,
    isLoading,
    errorText,
    routeSegments,
}) {
    const visibleRouteSegments = routeSegments.slice(0, 12);

    return (
        <section id="route-panel" className="panel">
            <div className="panel__heading">
                <div>
                    <p className="section-kicker">Маршрут между станциями</p>
                    <h2>Расписание электричек между двумя станциями</h2>
                </div>
            </div>

            <form className="route-form" onSubmit={onSubmit}>
                <StationAutocomplete
                    label="Станция отправления"
                    inputId="route-from"
                    placeholder="Например, Самара"
                    selectedStation={fromStation}
                    onSelect={onFromStationSelect}
                />
                <StationAutocomplete
                    label="Станция прибытия"
                    inputId="route-to"
                    placeholder="Например, Новокуйбышевская"
                    selectedStation={toStation}
                    onSelect={onToStationSelect}
                />
                <label className="date-field" htmlFor="route-date">
                    <span>Дата поездки</span>
                    <input
                        id="route-date"
                        type="date"
                        value={selectedDate}
                        onChange={(event) => onDateChange(event.target.value)}
                    />
                </label>
                <button type="submit" className="primary-button">
                    Показать маршруты
                </button>
            </form>

            {isLoading ? <LoadingBlock text="Подбираю маршруты..." /> : null}
            {errorText ? <p className="field-error">{errorText}</p> : null}
            {!isLoading && !errorText && routeSegments.length > 12 ? (
                <p className="results-note">
                    Показаны первые 12 вариантов из {routeSegments.length}.
                </p>
            ) : null}

            {!isLoading && !errorText && routeSegments.length === 0 ? (
                <EmptyState
                    title="Маршрутов пока нет"
                    text="Выберите две станции и нажмите кнопку."
                />
            ) : null}

            {routeSegments.length > 0 ? (
                <div className="route-list">
                    {visibleRouteSegments.map((segment) => (
                        <RouteCard key={segment.key} segment={segment} />
                    ))}
                </div>
            ) : null}
        </section>
    );
}

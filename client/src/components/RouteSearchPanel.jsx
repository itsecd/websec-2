import { EmptyState } from "./EmptyState";
import { LoadingBlock } from "./LoadingBlock";
import { RouteCard } from "./RouteCard";
import { StationAutocomplete } from "./StationAutocomplete";

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
                <p className="results-note">Показаны первые 12 вариантов из {routeSegments.length}.</p>
            ) : null}

            {!isLoading && !errorText && routeSegments.length === 0 ? (
                <EmptyState title="Маршрутов пока нет" text="Выберите две станции и нажмите кнопку." />
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

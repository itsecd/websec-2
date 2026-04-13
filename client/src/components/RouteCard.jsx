import { formatDateTime } from "../utils/dates";
import { formatDuration, formatStopsLabel, formatTransportLabel } from "../utils/formatters";

export function RouteCard({ segment }) {
    return (
        <article className="route-card">
            <header className="route-card__header">
                <div>
                    <h3>{segment.thread.shortTitle || segment.thread.title}</h3>
                    <p>
                        {segment.thread.number ? `№ ${segment.thread.number}` : "Без номера"}
                        {segment.thread.transportSubtype ? ` • ${segment.thread.transportSubtype}` : ""}
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
                        {segment.thread.vehicle || formatTransportLabel(segment.thread.transportType)}
                    </dd>
                </div>
            </dl>
        </article>
    );
}

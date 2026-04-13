import { formatDateTime, formatTime } from "../utils/dates";
import { formatStopsLabel } from "../utils/formatters";

export function ScheduleCard({ entry }) {
    return (
        <article className="schedule-card">
            <header className="schedule-card__header">
                <div>
                    <h3>{entry.thread.shortTitle || entry.thread.title}</h3>
                    <p className="schedule-card__subtitle">
                        {entry.thread.number ? `№ ${entry.thread.number}` : "Без номера"}
                        {entry.thread.transportSubtype ? ` • ${entry.thread.transportSubtype}` : ""}
                    </p>
                </div>
                <span className="schedule-card__carrier">
                    {entry.thread.carrier || "Перевозчик не указан"}
                </span>
            </header>

            <div className="schedule-times">
                <div>
                    <span>Прибытие</span>
                    <strong>{formatTime(entry.arrival)}</strong>
                    <small>{formatDateTime(entry.arrival)}</small>
                </div>
                <div>
                    <span>Отправление</span>
                    <strong>{formatTime(entry.departure)}</strong>
                    <small>{formatDateTime(entry.departure)}</small>
                </div>
            </div>

            <dl className="schedule-card__meta">
                <div>
                    <dt>Платформа</dt>
                    <dd>{entry.platform || "не указана"}</dd>
                </div>
                <div>
                    <dt>Терминал</dt>
                    <dd>{entry.terminal || "не указан"}</dd>
                </div>
                <div>
                    <dt>Остановки</dt>
                    <dd>{formatStopsLabel(entry.stops)}</dd>
                </div>
                <div>
                    <dt>Дни следования</dt>
                    <dd>{entry.days || entry.exceptDays || "нет данных"}</dd>
                </div>
            </dl>
        </article>
    );
}

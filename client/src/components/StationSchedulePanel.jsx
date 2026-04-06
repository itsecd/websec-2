import { formatDateTime, formatTime } from "../utils/dates";
import { formatStopsLabel } from "../utils/formatters";
import { EmptyState } from "./EmptyState";
import { LoadingBlock } from "./LoadingBlock";

function ScheduleCard({ entry }) {
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

export function StationSchedulePanel({
    selectedStation,
    selectedDate,
    onDateChange,
    isLoading,
    errorText,
    scheduleEntries,
}) {
    const hasSelectedStation = Boolean(selectedStation?.code);

    return (
        <section className="panel">
            <div className="panel__heading">
                <div>
                    <p className="section-kicker">Расписание по станции</p>
                    <h2>Все проходящие электрички через выбранную станцию</h2>
                </div>
                <label className="date-field" htmlFor="station-date">
                    <span>Дата</span>
                    <input
                        id="station-date"
                        type="date"
                        value={selectedDate}
                        onChange={(event) => onDateChange(event.target.value)}
                        disabled={!hasSelectedStation}
                    />
                </label>
            </div>

            {!hasSelectedStation ? (
                <EmptyState
                    title="Выберите станцию"
                    text="После выбора здесь появится расписание на выбранную дату."
                />
            ) : null}

            {hasSelectedStation && isLoading ? (
                <LoadingBlock text="Подгружаю расписание..." />
            ) : null}
            {hasSelectedStation && errorText ? <p className="field-error">{errorText}</p> : null}

            {hasSelectedStation && !isLoading && !errorText && scheduleEntries.length === 0 ? (
                <EmptyState
                    title="Рейсов не найдено"
                    text="Попробуйте другую дату или другую станцию."
                />
            ) : null}

            {hasSelectedStation && scheduleEntries.length > 0 ? (
                <div className="schedule-list">
                    {scheduleEntries.map((entry) => (
                        <ScheduleCard key={entry.key} entry={entry} />
                    ))}
                </div>
            ) : null}
        </section>
    );
}

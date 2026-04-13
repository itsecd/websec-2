import { EmptyState } from "./EmptyState";
import { LoadingBlock } from "./LoadingBlock";
import { ScheduleCard } from "./ScheduleCard";

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

            {hasSelectedStation && isLoading ? <LoadingBlock text="Подгружаю расписание..." /> : null}
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

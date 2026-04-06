import { APP_NAME } from "../config/app";

function SunIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2.7M12 18.8v2.7M21.5 12h-2.7M5.2 12H2.5M18.7 5.3l-1.9 1.9M7.2 16.8l-1.9 1.9M18.7 18.7l-1.9-1.9M7.2 7.2 5.3 5.3" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16.9 14.8A7.7 7.7 0 0 1 9.2 7.1c0-1.6.5-3.1 1.3-4.4A9 9 0 1 0 21.3 13c-1.3.8-2.8 1.3-4.4 1.3Z" />
        </svg>
    );
}

export function AppHeader({ theme, onThemeToggle }) {
    const nextThemeLabel = theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему";

    return (
        <header className="page-header">
            <div className="page-header__inner">
                <div className="page-header__main">
                    <p className="page-header__label">Пригородные поезда</p>
                    <h1>{APP_NAME}</h1>
                    <p className="page-header__text">
                        Поиск станции, расписание и маршруты по Самаре и области.
                    </p>
                </div>
                <div className="page-header__controls">
                    <nav className="page-header__nav" aria-label="Основные разделы">
                        <a href="#station-panel">Станция</a>
                        <a href="#route-panel">Маршрут</a>
                        <a href="#favorites-panel">Избранное</a>
                    </nav>

                    <button
                        type="button"
                        className={`theme-switch theme-switch--${theme}`}
                        onClick={onThemeToggle}
                        aria-label={nextThemeLabel}
                        title={nextThemeLabel}
                    >
                        <span className="theme-switch__icon" aria-hidden="true">
                            {theme === "dark" ? <MoonIcon /> : <SunIcon />}
                        </span>
                    </button>
                </div>
            </div>
        </header>
    );
}

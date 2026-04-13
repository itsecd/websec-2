import moonIconUrl from "../assets/moon.svg";
import sunIconUrl from "../assets/sun.svg";
import { APP_NAME } from "../config/app";

export function AppHeader({ theme, onThemeToggle }) {
    const nextThemeLabel = theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему";
    const themeIconUrl = theme === "dark" ? moonIconUrl : sunIconUrl;

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
                            <img src={themeIconUrl} alt="" />
                        </span>
                    </button>
                </div>
            </div>
        </header>
    );
}

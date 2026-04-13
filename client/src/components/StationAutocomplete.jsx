import { useEffect, useState } from "react";
import { suggestStations } from "../api/client";
import { formatStationLabel } from "../utils/formatters";
import { LoadingBlock } from "./LoadingBlock";

export function StationAutocomplete({ label, inputId, placeholder, selectedStation, onSelect }) {
    const [inputValue, setInputValue] = useState("");
    const [stationSuggestions, setStationSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorText, setErrorText] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        setInputValue(selectedStation ? formatStationLabel(selectedStation) : "");
        setStationSuggestions([]);
        setIsDropdownOpen(false);
    }, [selectedStation]);

    useEffect(() => {
        const trimmedValue = inputValue.trim();

        if (trimmedValue.length < 2) {
            setStationSuggestions([]);
            setIsDropdownOpen(false);
            setErrorText("");
            return undefined;
        }

        let isCancelled = false;
        const timeoutId = setTimeout(async () => {
            setIsLoading(true);
            setErrorText("");

            try {
                const response = await suggestStations(trimmedValue);

                if (isCancelled) {
                    return;
                }

                setStationSuggestions(response.stations || []);
                setIsDropdownOpen(true);
            } catch (error) {
                if (isCancelled) {
                    return;
                }

                setErrorText(error.message);
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }, 350);

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [inputValue]);

    function handleSuggestionClick(station) {
        onSelect(station);
        setInputValue(formatStationLabel(station));
        setIsDropdownOpen(false);
    }

    function handleClearClick() {
        setInputValue("");
        setStationSuggestions([]);
        setIsDropdownOpen(false);
        onSelect(null);
    }

    return (
        <div className="station-autocomplete">
            <label className="field-label" htmlFor={inputId}>
                {label}
            </label>
            <div className="station-autocomplete__control">
                <input
                    id={inputId}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                />
                {inputValue ? (
                    <button
                        type="button"
                        className="icon-button"
                        onClick={handleClearClick}
                        aria-label="Очистить поле"
                    >
                        ×
                    </button>
                ) : null}
            </div>

            {isLoading ? <LoadingBlock text="Ищу станции..." /> : null}
            {errorText ? <p className="field-error">{errorText}</p> : null}

            {isDropdownOpen && stationSuggestions.length > 0 ? (
                <ul className="suggestions-list">
                    {stationSuggestions.map((station) => (
                        <li key={station.code}>
                            <button
                                type="button"
                                className="suggestions-list__item"
                                onClick={() => handleSuggestionClick(station)}
                            >
                                <strong>{station.title}</strong>
                                <span>{[station.settlement, station.region].filter(Boolean).join(", ")}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

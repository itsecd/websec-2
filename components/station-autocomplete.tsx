"use client";

import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import { useDeferredValue, useEffect, useState } from "react";
import { StationSearchItem } from "@/lib/types";

type StationAutocompleteProps = {
  label: string;
  value: StationSearchItem | null;
  onChange: (value: StationSearchItem | null) => void;
  endpoint: string;
};

export function StationAutocomplete({
  label,
  value,
  onChange,
  endpoint
}: StationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value?.title ?? "");
  const deferredInputValue = useDeferredValue(inputValue);
  const [options, setOptions] = useState<StationSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (value?.title && value.title !== inputValue) {
      setInputValue(value.title);
    }
  }, [inputValue, value?.title]);

  useEffect(() => {
    if (deferredInputValue.trim().length < 2) {
      setOptions([]);
      return;
    }

    let cancelled = false;

    async function loadStations() {
      setIsLoading(true);

      try {
        const response = await fetch(`${endpoint}?q=${encodeURIComponent(deferredInputValue)}`);
        const payload = (await response.json()) as { results: StationSearchItem[] };

        if (!cancelled) {
          setOptions(payload.results);
        }
      } catch {
        if (!cancelled) {
          setOptions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStations();

    return () => {
      cancelled = true;
    };
  }, [deferredInputValue, endpoint]);

  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={(_, nextValue) => onChange(nextValue)}
      inputValue={inputValue}
      onInputChange={(_, nextInputValue) => setInputValue(nextInputValue)}
      getOptionLabel={(option) => option.title}
      filterOptions={(options) => options}
      noOptionsText={deferredInputValue.trim().length < 2 ? "Введите хотя бы 2 символа" : "Ничего не найдено"}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          {option.title}
          {option.settlementTitle ? `, ${option.settlementTitle}` : ""}
          {option.regionTitle ? `, ${option.regionTitle}` : ""}
        </li>
      )}
    />
  );
}

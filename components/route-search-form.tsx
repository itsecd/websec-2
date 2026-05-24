"use client";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import { Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StationAutocomplete } from "@components/station-autocomplete";
import { SearchParams } from "@/lib/search-params";
import { buildRouteQuery, createInitialStation } from "@/lib/station-form";
import type { StationSearchItem } from "@/shared/types";

type RouteSearchFormProps = {
  initialParams: SearchParams;
};

export function RouteSearchForm({ initialParams }: RouteSearchFormProps) {
  const router = useRouter();
  const [fromStation, setFromStation] = useState<StationSearchItem | null>(
    createInitialStation(initialParams.fromStationId, initialParams.fromStationTitle)
  );
  const [toStation, setToStation] = useState<StationSearchItem | null>(
    createInitialStation(initialParams.toStationId, initialParams.toStationTitle)
  );
  const [date, setDate] = useState(initialParams.date);

  const handleSubmit = () => {
    if (!fromStation || !toStation) {
      return;
    }

    router.push(`/?${buildRouteQuery(fromStation, toStation, date)}`);
  };

  const handleSwap = () => {
    setFromStation(toStation);
    setToStation(fromStation);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography fontWeight={600}>Маршрут электрички</Typography>
          <StationAutocomplete
            label="Откуда"
            value={fromStation}
            onChange={setFromStation}
            endpoint="/api/stations/search"
          />
          <StationAutocomplete
            label="Куда"
            value={toStation}
            onChange={setToStation}
            endpoint="/api/stations/search"
          />
          <TextField
            label="Дата"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button variant="outlined" size="medium" startIcon={<SwapHorizRoundedIcon />} onClick={handleSwap}>
              Поменять станции
            </Button>
            <Button
              variant="contained"
              size="medium"
              startIcon={<SearchRoundedIcon />}
              disabled={!fromStation || !toStation}
              onClick={handleSubmit}
            >
              Найти рейсы
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

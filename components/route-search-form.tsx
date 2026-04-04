"use client";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import { Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StationAutocomplete } from "@/components/station-autocomplete";
import { SearchParams } from "@/lib/search-params";
import { StationSearchItem } from "@/lib/types";

type RouteSearchFormProps = {
  initialParams: SearchParams;
};

export function RouteSearchForm({ initialParams }: RouteSearchFormProps) {
  const router = useRouter();
  const [fromStation, setFromStation] = useState<StationSearchItem | null>(
    initialParams.fromStationId && initialParams.fromStationTitle
      ? {
          id: initialParams.fromStationId,
          title: initialParams.fromStationTitle,
          regionTitle: null,
          settlementTitle: null,
          latitude: null,
          longitude: null
        }
      : null
  );
  const [toStation, setToStation] = useState<StationSearchItem | null>(
    initialParams.toStationId && initialParams.toStationTitle
      ? {
          id: initialParams.toStationId,
          title: initialParams.toStationTitle,
          regionTitle: null,
          settlementTitle: null,
          latitude: null,
          longitude: null
        }
      : null
  );
  const [date, setDate] = useState(initialParams.date);

  const handleSubmit = () => {
    if (!fromStation || !toStation) {
      return;
    }

    const params = new URLSearchParams();
    params.set("mode", "route");
    params.set("fromStationId", fromStation.id);
    params.set("fromStationTitle", fromStation.title);
    params.set("toStationId", toStation.id);
    params.set("toStationTitle", toStation.title);
    params.set("date", date);
    router.push(`/?${params.toString()}`);
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
            <Button variant="outlined" size="large" startIcon={<SwapHorizRoundedIcon />} onClick={handleSwap}>
              Поменять станции
            </Button>
            <Button
              variant="contained"
              size="large"
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

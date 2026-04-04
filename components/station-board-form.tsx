"use client";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StationAutocomplete } from "@/components/station-autocomplete";
import { StationMapPicker } from "@/components/station-map-picker";
import { SearchParams } from "@/lib/search-params";
import { StationSearchItem } from "@/lib/types";

type StationBoardFormProps = {
  initialParams: SearchParams;
};

export function StationBoardForm({ initialParams }: StationBoardFormProps) {
  const router = useRouter();
  const [station, setStation] = useState<StationSearchItem | null>(
    initialParams.stationId && initialParams.stationTitle
      ? {
          id: initialParams.stationId,
          title: initialParams.stationTitle,
          regionTitle: null,
          settlementTitle: null,
          latitude: null,
          longitude: null
        }
      : null
  );
  const [date, setDate] = useState(initialParams.date);

  const handleSubmit = () => {
    if (!station) {
      return;
    }

    const params = new URLSearchParams();
    params.set("mode", "station");
    params.set("stationId", station.id);
    params.set("stationTitle", station.title);
    params.set("date", date);
    router.push(`/?${params.toString()}`);
  };

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">Выберите станцию из поиска или нажмите на карту, чтобы найти ближайшие платформы.</Alert>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography fontWeight={600}>Станция</Typography>
            <StationAutocomplete
              label="Название станции"
              value={station}
              onChange={setStation}
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
              <Button
                variant="contained"
                size="large"
                startIcon={<SearchRoundedIcon />}
                disabled={!station}
                onClick={handleSubmit}
              >
                Показать расписание
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <StationMapPicker onSelect={setStation} selectedStation={station} />
    </Stack>
  );
}

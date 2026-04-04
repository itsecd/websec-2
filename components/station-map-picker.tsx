"use client";

import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import { Alert, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { StationSearchItem } from "@/lib/types";

const MapCanvas = dynamic(() => import("@/components/station-map").then((module) => module.StationMap), {
  ssr: false
});

type StationMapPickerProps = {
  selectedStation: StationSearchItem | null;
  onSelect: (station: StationSearchItem | null) => void;
};

export function StationMapPicker({ selectedStation, onSelect }: StationMapPickerProps) {
  const defaultCenter: [number, number] = [
    Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_LAT ?? 53.195873),
    Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_LNG ?? 50.100193)
  ];
  const [point, setPoint] = useState<[number, number]>(defaultCenter);
  const [stations, setStations] = useState<StationSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadNearbyStations() {
      setIsLoading(true);
      setHasError(false);

      try {
        const response = await fetch(`/api/stations/nearby?lat=${point[0]}&lng=${point[1]}`);
        const payload = (await response.json()) as { results?: StationSearchItem[] };

        if (!cancelled) {
          setStations(Array.isArray(payload.results) ? payload.results : []);
          setHasError(!response.ok);
        }
      } catch {
        if (!cancelled) {
          setStations([]);
          setHasError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadNearbyStations();

    return () => {
      cancelled = true;
    };
  }, [point]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
            <Typography fontWeight={600}>Карта станций</Typography>
            <Button variant="text" startIcon={<MyLocationRoundedIcon />} onClick={() => setPoint([...point] as [number, number])}>
              Обновить точки
            </Button>
          </Stack>
          <MapCanvas
            center={point}
            nearbyStations={Array.isArray(stations) ? stations : []}
            selectedStation={selectedStation}
            onPointSelect={setPoint}
            onStationSelect={onSelect}
          />
          {isLoading ? <Typography color="text.secondary">Ищем ближайшие станции...</Typography> : null}
          {hasError ? <Alert severity="warning">Не удалось загрузить станции около выбранной точки.</Alert> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

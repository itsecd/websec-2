"use client";

import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { StationSearchItem } from "@/shared/types";

const MapCanvas = dynamic(() => import("@components/station-map").then((module) => module.StationMap), {
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
        const requestUrl = new URL("/api/stations/nearby", window.location.origin);
        requestUrl.searchParams.set("lat", String(point[0]));
        requestUrl.searchParams.set("lng", String(point[1]));

        const response = await fetch(requestUrl);
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
    <MapPickerRoot>
      <MapCanvas
        center={point}
        nearbyStations={Array.isArray(stations) ? stations : []}
        selectedStation={selectedStation}
        onPointSelect={setPoint}
        onStationSelect={onSelect}
      />
      <MapControls spacing={1}>
        <Button
          variant="contained"
          startIcon={<MyLocationRoundedIcon />}
          onClick={() => setPoint([...point] as [number, number])}
          size="small"
          className="map-control-button"
        >
          Обновить точки
        </Button>
        {isLoading ? <MapStatus color="text.secondary">Ищем ближайшие станции...</MapStatus> : null}
        {hasError ? <Alert severity="warning">Не удалось загрузить станции около выбранной точки.</Alert> : null}
      </MapControls>
    </MapPickerRoot>
  );
}

const MapPickerRoot = styled(Box)({
  position: "relative",
  height: "100%"
});

const MapControls = styled(Stack)(({ theme }) => ({
  position: "absolute",
  right: theme.spacing(1.5),
  bottom: theme.spacing(1.5),
  left: theme.spacing(1.5),
  zIndex: 1200,
  alignItems: "stretch",
  [theme.breakpoints.up("md")]: {
    right: theme.spacing(2.5),
    bottom: theme.spacing(2.5),
    left: "auto",
    alignItems: "flex-end"
  },
  "& .map-control-button": {
    alignSelf: "stretch",
    [theme.breakpoints.up("md")]: {
      alignSelf: "flex-end"
    }
  }
}));

const MapStatus = styled(Typography)({
  padding: "6px 12px",
  borderRadius: 999,
  backgroundColor: "rgba(255, 255, 255, 0.9)"
});

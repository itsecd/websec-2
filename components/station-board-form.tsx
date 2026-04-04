"use client";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { styled } from "@mui/material/styles";
import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StationAutocomplete } from "@/components/station-autocomplete";
import { StationMapPicker } from "@/components/station-map-picker";
import { SearchParams } from "@/lib/search-params";
import { buildStationBoardQuery, createInitialStation } from "@/lib/station-form";
import { StationSearchItem } from "@/lib/types";

type StationBoardFormProps = {
  initialParams: SearchParams;
};

export function StationBoardForm({ initialParams }: StationBoardFormProps) {
  const router = useRouter();
  const [station, setStation] = useState<StationSearchItem | null>(
    createInitialStation(initialParams.stationId, initialParams.stationTitle)
  );
  const [date, setDate] = useState(initialParams.date);

  const handleSubmit = () => {
    if (!station) {
      return;
    }

    router.push(`/?${buildStationBoardQuery(station, date)}`);
  };

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">Выберите станцию из поиска или нажмите на карту, чтобы найти ближайшие платформы.</Alert>
      <HeroSection>
        <StationMapPicker onSelect={setStation} selectedStation={station} />
        <OverlayFormCard elevation={8}>
          <Stack spacing={2}>
            <Typography fontWeight={700}>Станция</Typography>
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
            <Button
              variant="contained"
              size="medium"
              startIcon={<SearchRoundedIcon />}
              disabled={!station}
              onClick={handleSubmit}
            >
              Показать расписание
            </Button>
          </Stack>
        </OverlayFormCard>
      </HeroSection>
    </Stack>
  );
}

const HeroSection = styled("section")(({ theme }) => ({
  position: "relative",
  height: 430,
  borderRadius: theme.spacing(2.5),
  overflow: "hidden",
  background: "linear-gradient(180deg, rgba(9, 30, 66, 0.12), rgba(9, 30, 66, 0.32))",
  isolation: "isolate",
  [theme.breakpoints.up("md")]: {
    height: 460
  }
}));

const OverlayFormCard = styled(Paper)(({ theme }) => ({
  position: "absolute",
  top: theme.spacing(2),
  left: theme.spacing(2),
  right: theme.spacing(2),
  maxWidth: 320,
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(1.5),
  backdropFilter: "blur(12px)",
  backgroundColor: "rgba(255, 255, 255, 0.84)",
  zIndex: 1200,
  [theme.breakpoints.up("md")]: {
    top: theme.spacing(3),
    left: theme.spacing(3),
    right: "auto",
    width: 360,
    maxWidth: 360,
    padding: theme.spacing(2.5)
  }
}));

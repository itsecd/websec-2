import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import TrainRoundedIcon from "@mui/icons-material/TrainRounded";
import {
  Alert,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography
} from "@mui/material";
import { RouteScheduleResponse, StationScheduleResponse } from "@/lib/types";

type SchedulePanelProps = {
  mode: "station" | "route";
  stationSchedule: StationScheduleResponse | null;
  routeSchedule: RouteScheduleResponse | null;
  stationTitle: string | null;
  fromTitle: string | null;
  toTitle: string | null;
};

export function SchedulePanel({
  mode,
  stationSchedule,
  routeSchedule,
  stationTitle,
  fromTitle,
  toTitle
}: SchedulePanelProps) {
  if (mode === "station") {
    if (!stationSchedule || !stationTitle) {
      return <SchedulePlaceholder title="Выберите станцию, чтобы увидеть все проходящие электрички." />;
    }

    return (
      <Card elevation={0}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700}>
              Расписание по станции {stationTitle}
            </Typography>
            <Typography color="text.secondary">
              Найдено рейсов: {stationSchedule.schedule.length}
            </Typography>
            {stationSchedule.schedule.length === 0 ? (
              <Alert severity="info">На выбранную дату пригородных рейсов по станции не найдено.</Alert>
            ) : (
              <List disablePadding>
                {stationSchedule.schedule.map((item) => (
                  <ListItem key={`${item.thread.uid}-${item.departure ?? item.arrival}`} sx={{ px: 0 }}>
                    <ListItemText
                      primary={item.thread.title}
                      secondary={`${item.direction ?? "Без направления"} • ${
                        item.departure ? formatDateTime(item.departure) : "время не указано"
                      }`}
                    />
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip icon={<TrainRoundedIcon />} label={item.thread.number || "Без номера"} />
                      {item.platform ? <Chip icon={<AccessTimeRoundedIcon />} label={`Путь ${item.platform}`} /> : null}
                    </Stack>
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!routeSchedule || !fromTitle || !toTitle) {
    return <SchedulePlaceholder title="Выберите две станции, чтобы увидеть рейсы между ними." />;
  }

  return (
    <Card elevation={0}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>
            Рейсы {fromTitle} → {toTitle}
          </Typography>
          <Typography color="text.secondary">Найдено вариантов: {routeSchedule.segments.length}</Typography>
          {routeSchedule.segments.length === 0 ? (
            <Alert severity="info">На выбранную дату прямых пригородных рейсов между станциями не найдено.</Alert>
          ) : (
            <List disablePadding>
              {routeSchedule.segments.map((segment) => (
                <ListItem key={`${segment.thread.uid}-${segment.departure}`} sx={{ px: 0 }}>
                  <ListItemText
                    primary={segment.thread.title}
                    secondary={`${formatDateTime(segment.departure)} → ${formatDateTime(segment.arrival)}`}
                  />
                  <Stack direction="row" spacing={1}>
                    <Chip icon={<AltRouteRoundedIcon />} label={segment.durationLabel} />
                    <Chip icon={<TrainRoundedIcon />} label={segment.thread.number || "Без номера"} />
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

type SchedulePlaceholderProps = {
  title: string;
};

function SchedulePlaceholder({ title }: SchedulePlaceholderProps) {
  return (
    <Card elevation={0}>
      <CardContent>
        <Typography color="text.secondary">{title}</Typography>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  });
}

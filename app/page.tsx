import { Container, Stack, Typography } from "@mui/material";
import { DashboardShell } from "@/components/dashboard-shell";
import { SearchParams, parseSearchParams } from "@/lib/search-params";
import { getRouteSchedule, getStationSchedule } from "@/lib/yandex-rasp";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const params = parseSearchParams(resolvedSearchParams);

  const [stationSchedule, routeSchedule] = await Promise.all([
    shouldLoadStationBoard(params) ? getStationSchedule(params.stationId!, params.date) : null,
    shouldLoadRoute(params) ? getRouteSchedule(params.fromStationId!, params.toStationId!, params.date) : null
  ]);

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: { xs: 1.5, md: 2.5 },
        minHeight: "100svh",
        display: "flex",
        alignItems: "stretch"
      }}
    >
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Stack spacing={1}>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Рассписание поездов
          </Typography>
        </Stack>
        <DashboardShell
          initialParams={params}
          stationSchedule={stationSchedule}
          routeSchedule={routeSchedule}
        />
      </Stack>
    </Container>
  );
}

function shouldLoadStationBoard(params: SearchParams) {
  return params.mode === "station" && Boolean(params.stationId);
}

function shouldLoadRoute(params: SearchParams) {
  return params.mode === "route" && Boolean(params.fromStationId && params.toStationId);
}

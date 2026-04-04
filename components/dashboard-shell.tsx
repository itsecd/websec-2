"use client";

import DirectionsRailwayRoundedIcon from "@mui/icons-material/DirectionsRailwayRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RouteSearchForm } from "@/components/route-search-form";
import { SchedulePanel } from "@/components/schedule-panel";
import { StationBoardForm } from "@/components/station-board-form";
import { SearchParams } from "@/lib/search-params";
import { RouteScheduleResponse, StationScheduleResponse } from "@/lib/types";

type DashboardShellProps = {
  initialParams: SearchParams;
  stationSchedule: StationScheduleResponse | null;
  routeSchedule: RouteScheduleResponse | null;
};

export function DashboardShell({
  initialParams,
  stationSchedule,
  routeSchedule
}: DashboardShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(initialParams.mode);

  useEffect(() => {
    setTab(initialParams.mode);
  }, [initialParams.mode]);

  const handleTabChange = (_: React.SyntheticEvent, nextTab: SearchParams["mode"]) => {
    setTab(nextTab);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("mode", nextTab);

    if (nextTab === "station") {
      nextParams.delete("fromStationId");
      nextParams.delete("fromStationTitle");
      nextParams.delete("toStationId");
      nextParams.delete("toStationTitle");
    } else {
      nextParams.delete("stationId");
      nextParams.delete("stationTitle");
    }

    router.replace(`/?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Stack spacing={3}>
          <Card elevation={0}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight={700}>
                  Поиск и расписания
                </Typography>
                <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
                  <Tab
                    icon={<DirectionsRailwayRoundedIcon />}
                    iconPosition="start"
                    label="По станции"
                    value="station"
                  />
                  <Tab
                    icon={<RouteRoundedIcon />}
                    iconPosition="start"
                    label="Между станциями"
                    value="route"
                  />
                </Tabs>
                <Box hidden={tab !== "station"}>
                  <StationBoardForm initialParams={initialParams} />
                </Box>
                <Box hidden={tab !== "route"}>
                  <RouteSearchForm initialParams={initialParams} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
          <SchedulePanel
            mode={tab}
            stationSchedule={stationSchedule}
            routeSchedule={routeSchedule}
            stationTitle={initialParams.stationTitle}
            fromTitle={initialParams.fromStationTitle}
            toTitle={initialParams.toStationTitle}
          />
        </Stack>
      </Grid>
    </Grid>
  );
}

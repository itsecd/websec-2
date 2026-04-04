export type StationSearchItem = {
  id: string;
  title: string;
  regionTitle: string | null;
  settlementTitle: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type StationScheduleItem = {
  arrival: string | null;
  departure: string | null;
  direction: string | null;
  platform: string | null;
  thread: {
    uid: string;
    title: string;
    number: string;
  };
};

export type StationScheduleResponse = {
  schedule: StationScheduleItem[];
};

export type RouteSegment = {
  arrival: string;
  departure: string;
  durationLabel: string;
  thread: {
    uid: string;
    title: string;
    number: string;
  };
};

export type RouteScheduleResponse = {
  segments: RouteSegment[];
};

export type StationIndexItem = StationSearchItem;

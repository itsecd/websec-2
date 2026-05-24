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

export type YandexScheduleResponse = {
  schedule: Array<{
    arrival: string | null;
    departure: string | null;
    thread: {
      uid: string;
      title: string;
      number: string;
    };
    platform: string;
    direction: string | null;
  }>;
};

export type YandexSearchResponse = {
  segments: Array<{
    arrival: string;
    departure: string;
    duration: number;
    thread: {
      uid: string;
      title: string;
      number: string;
    };
  }>;
};

export type YandexNearestStationsResponse = {
  stations: Array<{
    code: string;
    title: string;
    lat: number | null;
    lng: number | null;
    station_type?: string;
    transport_type?: string;
    region?: {
      title: string;
    };
    settlement?: {
      title: string;
    };
    type_choices?: {
      suburban?: {
        desktop_url: string;
        touch_url: string;
      };
    };
  }>;
};

"use client";

import "ol/ol.css";
import { Box } from "@mui/material";
import Feature from "ol/Feature";
import Map from "ol/Map";
import Overlay from "ol/Overlay";
import View from "ol/View";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat, toLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { useEffect, useRef } from "react";
import type { StationSearchItem } from "@/shared/types";

type StationMapProps = {
  center: [number, number];
  nearbyStations?: StationSearchItem[];
  selectedStation: StationSearchItem | null;
  onPointSelect: (point: [number, number]) => void;
  onStationSelect: (station: StationSearchItem) => void;
};

const defaultZoom = Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM ?? 11);
const stationStyle = new Style({
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({ color: "#1976d2" }),
    stroke: new Stroke({ color: "#ffffff", width: 2 })
  })
});
const selectedStationStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: "#d32f2f" }),
    stroke: new Stroke({ color: "#ffffff", width: 2 })
  })
});

export function StationMap({
  center,
  nearbyStations = [],
  selectedStation,
  onPointSelect,
  onStationSelect
}: StationMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const popupElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const popupOverlayRef = useRef<Overlay | null>(null);
  const stationSourceRef = useRef<VectorSource<Feature<Point>> | null>(null);
  const initialCenterRef = useRef(center);
  const onPointSelectRef = useRef(onPointSelect);
  const onStationSelectRef = useRef(onStationSelect);

  useEffect(() => {
    onPointSelectRef.current = onPointSelect;
    onStationSelectRef.current = onStationSelect;
  }, [onPointSelect, onStationSelect]);

  useEffect(() => {
    if (!mapElementRef.current || !popupElementRef.current) {
      return;
    }

    const stationSource = new VectorSource<Feature<Point>>();
    const stationLayer = new VectorLayer({
      source: stationSource
    });
    const popupOverlay = new Overlay({
      element: popupElementRef.current,
      positioning: "bottom-center",
      stopEvent: false,
      offset: [0, -12]
    });
    const map = new Map({
      target: mapElementRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        stationLayer
      ],
      overlays: [popupOverlay],
      view: new View({
        center: fromLonLat([initialCenterRef.current[1], initialCenterRef.current[0]]),
        zoom: defaultZoom
      })
    });

    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (candidate) => candidate);
      const station = feature?.get("station") as StationSearchItem | undefined;

      if (station) {
        onStationSelectRef.current(station);
        popupElementRef.current!.textContent = station.title;
        popupOverlay.setPosition(fromLonLat([station.longitude!, station.latitude!]));
        return;
      }

      const [lng, lat] = toLonLat(event.coordinate);
      popupOverlay.setPosition(undefined);
      onPointSelectRef.current([lat, lng]);
    });

    mapRef.current = map;
    popupOverlayRef.current = popupOverlay;
    stationSourceRef.current = stationSource;
    window.setTimeout(() => map.updateSize(), 0);

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      popupOverlayRef.current = null;
      stationSourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    map.getView().setCenter(fromLonLat([center[1], center[0]]));
    window.setTimeout(() => map.updateSize(), 0);
  }, [center]);

  useEffect(() => {
    const stationSource = stationSourceRef.current;

    if (!stationSource) {
      return;
    }

    const features = nearbyStations.flatMap((station) => {
      if (station.latitude === null || station.longitude === null) {
        return [];
      }

      const feature = new Feature({
        geometry: new Point(fromLonLat([station.longitude, station.latitude])),
        station
      });
      feature.setStyle(selectedStation?.id === station.id ? selectedStationStyle : stationStyle);

      return [feature];
    });

    stationSource.clear();
    stationSource.addFeatures(features);
  }, [nearbyStations, selectedStation]);

  return (
    <Box sx={{ height: "100%", width: "100%", overflow: "hidden", position: "relative" }}>
      <Box ref={mapElementRef} sx={{ height: "100%", width: "100%" }} />
      <Box
        ref={popupElementRef}
        sx={{
          bgcolor: "background.paper",
          borderRadius: 1,
          boxShadow: 3,
          color: "text.primary",
          fontSize: 13,
          maxWidth: 240,
          px: 1,
          py: 0.5,
          pointerEvents: "none",
          whiteSpace: "normal"
        }}
      />
    </Box>
  );
}

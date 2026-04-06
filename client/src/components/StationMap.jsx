import { useEffect, useRef } from "react";
import Feature from "ol/Feature.js";
import Map from "ol/Map.js";
import View from "ol/View.js";
import { Point } from "ol/geom.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import { fromLonLat, toLonLat } from "ol/proj.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style.js";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "../config/map";

const defaultMarkerStyle = new Style({
    image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: "#8b2332" }),
        stroke: new Stroke({ color: "#fff7ef", width: 2 }),
    }),
});

const activeMarkerStyle = new Style({
    image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: "#0d6efd" }),
        stroke: new Stroke({ color: "#ffffff", width: 3 }),
    }),
});

const pickedPointStyle = new Style({
    image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: "#dc3545" }),
        stroke: new Stroke({ color: "#ffffff", width: 3 }),
    }),
});

function hasCoordinates(point) {
    return point?.lng != null && point?.lat != null;
}

function makePointFeature(longitude, latitude, style) {
    const feature = new Feature({
        geometry: new Point(fromLonLat([longitude, latitude])),
    });

    feature.setStyle(style);
    return feature;
}

export function StationMap({ nearbyStations, selectedStation, pickedPoint, onMapPointPick }) {
    const mapElementRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef(new VectorSource());

    useEffect(() => {
        if (!mapElementRef.current || mapInstanceRef.current) {
            return;
        }

        const markerLayer = new VectorLayer({
            source: markersRef.current,
        });

        const map = new Map({
            target: mapElementRef.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                markerLayer,
            ],
            view: new View({
                center: fromLonLat(DEFAULT_MAP_CENTER),
                zoom: DEFAULT_MAP_ZOOM,
            }),
        });

        map.on("click", (event) => {
            const [longitude, latitude] = toLonLat(event.coordinate);
            onMapPointPick({
                lat: Number(latitude.toFixed(6)),
                lng: Number(longitude.toFixed(6)),
            });
        });

        mapInstanceRef.current = map;
    }, [onMapPointPick]);

    useEffect(() => {
        const source = markersRef.current;
        source.clear();
        const renderedCodes = new Set();

        if (hasCoordinates(pickedPoint)) {
            source.addFeature(makePointFeature(pickedPoint.lng, pickedPoint.lat, pickedPointStyle));
        }

        for (const station of nearbyStations) {
            if (!hasCoordinates(station)) {
                continue;
            }

            const markerStyle =
                station.code === selectedStation?.code ? activeMarkerStyle : defaultMarkerStyle;
            source.addFeature(makePointFeature(station.lng, station.lat, markerStyle));
            renderedCodes.add(station.code);
        }

        if (selectedStation?.code && hasCoordinates(selectedStation)) {
            if (!renderedCodes.has(selectedStation.code)) {
                source.addFeature(
                    makePointFeature(selectedStation.lng, selectedStation.lat, activeMarkerStyle),
                );
            }
        }

        if (hasCoordinates(selectedStation) && mapInstanceRef.current) {
            mapInstanceRef.current.getView().animate({
                center: fromLonLat([selectedStation.lng, selectedStation.lat]),
                zoom: 12,
            });
        } else if (hasCoordinates(pickedPoint) && mapInstanceRef.current) {
            mapInstanceRef.current
                .getView()
                .animate({ center: fromLonLat([pickedPoint.lng, pickedPoint.lat]), zoom: 12 });
        }
    }, [nearbyStations, pickedPoint, selectedStation]);

    return <div ref={mapElementRef} className="station-map" />;
}

import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Circle, Fill, Stroke, Text } from 'ol/style';
import { stationAPI } from '../services/api';
import { favoritesService } from '../services/favorites';
import { getVectorLayerByName, createNamedVectorLayer } from '../utils/layerInstruments';
import { 
  DEFAULT_MAP_CENTER, 
  MAP_SEARCH_PARAMS, 
  MAP_VIEW_CONFIG, 
  LAYER_NAMES 
} from '../config/mapConfig';

export default function MapSearch({ onSelectStation, favorites, onToggleFavorite }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    const stationsSource = new VectorSource();
    
    const stationsLayer = createNamedVectorLayer({
      source: stationsSource,
      style: (feature) => {
        const code = feature.get('code');
        const isFavorite = code && favoritesService.isFavorite(code);
        
        return new Style({
          image: new Circle({
            radius: 8,
            fill: new Fill({ color: isFavorite ? '#dc3545' : '#0066cc' }),
            stroke: new Stroke({ color: '#fff', width: 2 })
          }),
          text: new Text({
            text: feature.get('title') || '',
            offsetY: -15,
            font: '11px sans-serif',
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
            overflow: true
          })
        });
      }
    }, LAYER_NAMES.stations);

    const newMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        stationsLayer
      ],
      view: new View({
        center: fromLonLat([DEFAULT_MAP_CENTER.lng, DEFAULT_MAP_CENTER.lat]),
        zoom: MAP_VIEW_CONFIG.defaultZoom,
        minZoom: MAP_VIEW_CONFIG.minZoom,
        maxZoom: MAP_VIEW_CONFIG.maxZoom
      })
    });


    newMap.on('singleclick', async (event) => {
      const clickedFeature = newMap.forEachFeatureAtPixel(event.pixel, (feature) => {
        return feature.get('code') ? feature : null;
      });
      
      if (clickedFeature && clickedFeature.get('code')) {
        const station = clickedFeature.getProperties();
        console.log(`Выбрана станция: ${station.title}`);
        onSelectStation?.(station);
        return; 
      }

      const lonLat = toLonLat(event.coordinate);
      const lng = lonLat[0];
      const lat = lonLat[1];
      
      console.log(`Клик по карте: lat=${lat.toFixed(4)}, lng=${lng.toFixed(4)}`);
      setLoading(true);
      
      try {
        const { distance, limit } = MAP_SEARCH_PARAMS.click;
        const response = await stationAPI.nearby(lat, lng, distance, limit);

        const layer = getVectorLayerByName(newMap, LAYER_NAMES.stations);
        if (!layer) {
          console.error('Слой станций не найден');
          return;
        }
        
        const source = layer.getSource();
        source.clear();
        
        if (response?.stations && response.stations.length > 0) {
          console.log(`Найдено ${response.stations.length} станций`);
          
          response.stations.forEach(station => {
            if (station.latitude && station.longitude) {
              const feature = new Feature({
                geometry: new Point(fromLonLat([station.longitude, station.latitude])),
                ...station
              });
              source.addFeature(feature);
            }
          });
        } else {
          console.log('Станции не найдены');
        }
      } catch (err) {
        console.error('Ошибка поиска станций:', err);
      } finally {
        setLoading(false);
      }
    });

    setMap(newMap);

    const loadInitial = async () => {
      try {
        const { distance, limit } = MAP_SEARCH_PARAMS.initial;
        const response = await stationAPI.nearby(
          DEFAULT_MAP_CENTER.lat, 
          DEFAULT_MAP_CENTER.lng, 
          distance, 
          limit
        );
        
        const layer = getVectorLayerByName(newMap, LAYER_NAMES.stations);
        if (!layer) return;
        
        const source = layer.getSource();
        source.clear();

        if (response?.stations) {
          response.stations.forEach(station => {
            if (station.latitude && station.longitude) {
              const feature = new Feature({
                geometry: new Point(fromLonLat([station.longitude, station.latitude])),
                ...station
              });
              source.addFeature(feature);
            }
          });
        }
      } catch (err) {
        console.error('Initial load error:', err);
      }
    };
    loadInitial();

    return () => newMap.setTarget(null);
  }, []);

  useEffect(() => {
    if (!map) return;
    
    const layer = getVectorLayerByName(map, LAYER_NAMES.stations);
    if (layer) {
      layer.getSource().changed(); // Перерисовка с учётом новых цветов
    }
  }, [map, favorites]);

  return (
    <div>
      <div className="card mb-3">
        <h3 className="h5 mb-3">
          <i className="bi bi-map me-2"></i>
          Поиск на карте
        </h3>
        <p className="text-muted small mb-3">
          <i className="bi bi-info-circle me-1"></i>
          При загрузке показаны станции в радиусе {MAP_SEARCH_PARAMS.initial.distance} км от {DEFAULT_MAP_CENTER.label}.
          <br/>
          <strong>Кликните по маркеру</strong> — выбрать станцию.
          <br/>
          <strong>Кликните по карте</strong> — найти станции в другом районе.
        </p>
        
        <div 
          ref={mapRef} 
          className="border rounded" 
          style={{ height: '500px', width: '100%' }}
        />
        
        {loading && (
          <div className="text-center text-muted py-2">
            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
            Поиск станций...
          </div>
        )}
      </div>
    </div>
  );
}
import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Circle, Fill, Stroke, Text } from 'ol/style';
import { stationAPI } from '../services/api';
import { favoritesService } from '../services/favorites';

const MOSCOW_CENTER = [37.6173, 55.7558];

export default function MapSearch({ onSelectStation, favorites, onToggleFavorite }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [stationsLayer, setStationsLayer] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    const stationsSource = new VectorSource();
    const layer = new VectorLayer({
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
    });

    const newMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        layer
      ],
      view: new View({
        center: fromLonLat(MOSCOW_CENTER),
        zoom: 10,
        minZoom: 5,
        maxZoom: 18
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
        const response = await stationAPI.nearby(lat, lng, 50, 30);
        stationsSource.clear();
        
        if (response.data?.stations && response.data.stations.length > 0) {
          console.log(`Найдено ${response.data.stations.length} станций`);
          
          response.data.stations.forEach(station => {
            if (station.latitude && station.longitude) {
              const feature = new Feature({
                geometry: new Point(fromLonLat([station.longitude, station.latitude])),
                ...station
              });
              stationsSource.addFeature(feature);
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
    setStationsLayer(layer);

    return () => newMap.setTarget(null);
  }, []);

  useEffect(() => {
    if (!stationsLayer) return;
    
    const loadInitial = async () => {
      try {
        const response = await stationAPI.nearby(55.7558, 37.6173, 30, 30);
        const source = stationsLayer.getSource();
        source.clear();
        
        if (response.data?.stations) {
          response.data.stations.forEach(station => {
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
  }, [stationsLayer]);

  useEffect(() => {
    if (!stationsLayer) return;
    const source = stationsLayer.getSource();
    source.changed();
  }, [stationsLayer, favorites]);

  return (
    <div>
      <div className="card mb-3">
        <h3 className="h5 mb-3">
          <i className="bi bi-map me-2"></i>
          Поиск на карте
        </h3>
        <p className="text-muted small mb-3">
          <i className="bi bi-info-circle me-1"></i>
          При загрузке показаны ближайшие станции.
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
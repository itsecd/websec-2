import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat } from 'ol/proj'
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style'
import { getVectorSourceByName } from '../utils/mapHelpers'

function MapComponent({ stations, selectedStation, onStationSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current) return

    const vectorSource = new VectorSource()
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: function(feature) {
        const station = feature.get('station')
        const isSelected = selectedStation?.code === station?.code
        
        return new Style({
          image: new CircleStyle({
            radius: isSelected ? 12 : 8,
            fill: new Fill({ 
              color: isSelected ? '#FF5722' : '#2563eb' 
            }),
            stroke: new Stroke({ 
              color: 'white', 
              width: 2 
            })
          }),
          text: new Text({
            text: '🚆',
            offsetY: isSelected ? -20 : -15,
            scale: isSelected ? 1.8 : 1.5
          })
        })
      }
    })

    vectorLayer.set('name', 'stations-layer')

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        vectorLayer 
      ],
      view: new View({
        center: fromLonLat([50.12, 53.20]),
        zoom: 10
      })
    })

    mapInstanceRef.current = map

    map.on('click', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature)
      if (feature) {
        const station = feature.get('station')
        if (station && onStationSelect) {
          onStationSelect(station)
        }
      }
    })

    map.on('pointermove', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature)
      map.getTargetElement().style.cursor = feature ? 'pointer' : ''
    })

  }, [onStationSelect, selectedStation])

  useEffect(() => {
    if (!stations?.length || !mapInstanceRef.current) return

    const source = getVectorSourceByName(mapInstanceRef.current, 'stations-layer')
    if (!source) return

    source.clear()

    stations.forEach(station => {
      if (station.latitude && station.longitude) {
        const feature = new Feature({
          geometry: new Point(fromLonLat([station.longitude, station.latitude])),
          station: station
        })
        source.addFeature(feature)
      }
    })

    if (selectedStation) {
      const view = mapInstanceRef.current.getView()
      view.animate({
        center: fromLonLat([selectedStation.longitude, selectedStation.latitude]),
        zoom: 13,
        duration: 500
      })
    }
  }, [stations, selectedStation])

  return <div ref={mapRef} className="map-container" />
}

export default MapComponent
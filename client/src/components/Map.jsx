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

function MapComponent({ stations, selectedStation, onStationSelect }) {
  const mapRef = useRef(null)
  const vectorSourceRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const selectedFeatureRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current) return

    vectorSourceRef.current = new VectorSource()

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        new VectorLayer({
          source: vectorSourceRef.current,
          style: function(feature) {
            const station = feature.get('station')
            const isSelected = selectedStation?.code === station?.code
            
            return new Style({
              image: new CircleStyle({
                radius: isSelected ? 12 : 8,
                fill: new Fill({ 
                  color: isSelected ? '#FF5722' : '#2196F3' 
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
      if (feature) {
        map.getTargetElement().style.cursor = 'pointer'
      } else {
        map.getTargetElement().style.cursor = ''
      }
    })

    return () => {
      map.setTarget(null)
    }
  }, [onStationSelect])

  useEffect(() => {
    if (!vectorSourceRef.current) return

    vectorSourceRef.current.clear()

    if (!stations?.length) return

    stations.forEach(station => {
      if (station.latitude && station.longitude) {
        const feature = new Feature({
          geometry: new Point(fromLonLat([station.longitude, station.latitude])),
          station: station
        })
        vectorSourceRef.current.addFeature(feature)
      }
    })

    if (selectedStation && mapInstanceRef.current) {
      const view = mapInstanceRef.current.getView()
      view.animate({
        center: fromLonLat([selectedStation.longitude, selectedStation.latitude]),
        zoom: 13,
        duration: 500
      })
    }
  }, [stations, selectedStation])

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '400px',
        borderRadius: '12px',
        marginBottom: '1rem',
        border: '2px solid #e0e0e0'
      }}
    />
  )
}

export default MapComponent
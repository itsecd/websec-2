import VectorLayer from 'ol/layer/Vector';

export function getVectorLayerByName(mapObject, layerName) {
  if (!mapObject) return null;
  
  return mapObject.getAllLayers().find(layer => layer.get('name') === layerName) ?? null;
}

export function createNamedVectorLayer(options, name) {
  const layer = new VectorLayer(options);  
  layer.set('name', name);
  return layer;
}
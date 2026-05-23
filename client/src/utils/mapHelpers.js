/**
 * Находит векторный слой по имени и возвращает его Source
 * @param {import('ol/Map').default} mapObject - Экземпляр карты
 * @param {string} layerName - Имя слоя, которое мы задали через .set('name', ...)
 * @returns {import('ol/source/Vector').default | null}
 */
export function getVectorSourceByName(mapObject, layerName) {
  if (!mapObject) return null;

  const layers = mapObject.getLayers().getArray();
  const vectorLayer = layers.find((layer) => layer.get('name') === layerName);

  if (!vectorLayer) {
    console.warn(`Слой "${layerName}" не найден`);
    return null;
  }

  return vectorLayer.getSource();
}
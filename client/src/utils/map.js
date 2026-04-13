export function getVectorSourceByLayerName(mapObject, layerName) {
    if (!mapObject) {
        return null;
    }

    const vectorLayer = mapObject
        .getAllLayers()
        .find((layer) => layer.get("name") === layerName);

    if (!vectorLayer) {
        return null;
    }

    return vectorLayer.getSource();
}

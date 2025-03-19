import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function MapController({ userPosition, onBoundsChange }) {
    const map = useMap();
    useEffect(() => {
      if (userPosition) {
        map.setView(userPosition, 13); 
      }
    }, [map, userPosition]);
  
    useEffect(() => {
      const handleMoveEnd = () => {
        const bounds = map.getBounds();
        onBoundsChange(bounds);
      };
  
      map.on("moveend", handleMoveEnd);
  
      return () => {
        map.off("moveend", handleMoveEnd);
      };
    }, [map, onBoundsChange]);
  
    return null;
}
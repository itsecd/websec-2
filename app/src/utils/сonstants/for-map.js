import L from "leaflet";


export const userIcon = L.icon({
    iconUrl: "/images/icons/user-icon.png",
    iconSize: [64, 64],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
  
  
export const stationIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

export const defaultPosition = [55.7558, 37.6173];
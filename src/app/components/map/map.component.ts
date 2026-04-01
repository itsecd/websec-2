import { Component, AfterViewInit, Output, EventEmitter, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { City } from '../../models/city.models';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit, OnChanges {
  private map: L.Map | null = null;
  private markers: L.CircleMarker[] = [];

  @Input() cities: City[] = [];
  @Output() citySelected = new EventEmitter<City>();

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 200);
  }

  ngOnChanges(): void {
    if (this.map) {
      this.updateMarkers();
    }
  }

  private initMap(): void {
    const mapElement = document.getElementById('map');
    if (!mapElement || this.map) return;

    this.map = L.map('map', {
      center: [55.75, 37.61],
      zoom: 4,
      zoomControl: true,
      fadeAnimation: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);

    this.updateMarkers();
  }

  private updateMarkers(): void {
  if (!this.map) return;

  this.markers.forEach(marker => marker.remove());
  this.markers = [];

  this.cities.forEach(city => {
    const marker = L.circleMarker([city.lat, city.lon], {
      radius: 5,
      color: '#40916c',
      fillColor: '#2d6a4f',
      fillOpacity: 0.85,
      weight: 2
    }).addTo(this.map!);

    marker.bindTooltip(city.name);
    marker.on('click', () => {
      this.map?.setView([city.lat, city.lon], 8);
      this.citySelected.emit(city);
    });

    this.markers.push(marker);
  });
}

  setView(lat: number, lon: number): void {
    this.map?.setView([lat, lon], 8);
  }
}
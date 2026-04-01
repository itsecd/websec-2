import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CityService } from './services/city.service';
import { City } from './models/city.models';
import { MapComponent } from './components/map/map.component';
import { SearchComponent } from './components/search/search.component';
import { WeatherComponent } from './components/weather/weather.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MapComponent, SearchComponent, WeatherComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit {
  cities: City[] = [];
  selectedCity: City | null = null;

  constructor(private cityService: CityService) {}

  ngOnInit(): void {
    this.cityService.loadCities().subscribe({
      next: (data) => {
        this.cities = data;
        this.cityService.setCities(data);
      },
      error: (err) => {
        console.error('Ошибка загрузки городов:', err);
      }
    });
  }

  onCitySelected(city: City): void {
    this.selectedCity = city;
  }

  closeModal(): void {
    this.selectedCity = null;
  }
}
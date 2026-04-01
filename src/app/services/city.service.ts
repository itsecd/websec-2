import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { City } from '../models/city.models';

@Injectable({
  providedIn: 'root'
})
export class CityService {
  private cities: City[] = [];

  constructor(private http: HttpClient) {}

  loadCities(): Observable<City[]> {
    return this.http.get<City[]>('/assets/cities.json');
  }

  setCities(cities: City[]): void {
    this.cities = cities;
  }

  getCities(): City[] {
    return this.cities;
  }

  searchCities(query: string): City[] {
    if (!query || query.length < 2) return [];
    const lowerQuery = query.toLowerCase();
    return this.cities
      .filter(city => city.name.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }

  formatPopulation(population: number): string {
    if (population >= 1000000) {
      return (population / 1000000).toFixed(1).replace('.0', '') + ' млн';
    }
    if (population >= 1000) {
      return Math.round(population / 1000) + ' тыс.';
    }
    return population.toString();
  }
}
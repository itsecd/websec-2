import { Component, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CityService } from '../../services/city.service';
import { City } from '../../models/city.models';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent {
  query: string = '';
  results: City[] = [];
  showResults: boolean = false;

  @Output() citySelected = new EventEmitter<City>();

  constructor(private cityService: CityService) {}

  onSearchInput(): void {
    this.results = this.cityService.searchCities(this.query);
    this.showResults = this.results.length > 0 && this.query.length >= 2;
  }

  selectCity(city: City): void {
    this.query = city.name;
    this.showResults = false;
    this.citySelected.emit(city);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-box')) {
      this.showResults = false;
    }
  }

  formatPopulation(population: number): string {
    return this.cityService.formatPopulation(population);
  }
}
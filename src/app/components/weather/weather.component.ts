import { Component, Input, OnChanges, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CityService } from '../../services/city.service';
import { WeatherService } from '../../services/weather.service';
import { City, WeatherData, CurrentWeather, DailyWeather } from '../../models/city.models';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-weather',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.css']
})
export class WeatherComponent implements OnChanges {
  @Input() city: City | null = null;
  @ViewChild('weatherChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  loading: boolean = false;
  error: boolean = false;
  weatherData: WeatherData | null = null;
  currentWeather: CurrentWeather | null = null;
  dailyWeather: DailyWeather | null = null;
  private chart: Chart | null = null;

  constructor(
    private weatherService: WeatherService,
    private cityService: CityService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(): void {
    if (this.city) {
      this.loadWeather();
    }
  }

  loadWeather(): void {
    if (!this.city) return;

    this.loading = true;
    this.error = false;
    this.weatherData = null;
    this.currentWeather = null;
    this.dailyWeather = null;
    this.cdr.detectChanges();

    this.weatherService.getWeather(this.city.lat, this.city.lon).subscribe({
      next: (data) => {
        this.weatherData = data;
        this.currentWeather = data.current;
        this.dailyWeather = data.daily;
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.drawChart(), 200);
      },
      error: (err) => {
        console.error('Ошибка загрузки погоды:', err);
        this.loading = false;
        this.error = true;
        this.cdr.detectChanges();
      }
    });
  }

  drawChart(): void {
  if (!this.dailyWeather || !this.chartCanvas) return;

  if (this.chart) {
    this.chart.destroy();
  }

  const ctx = this.chartCanvas.nativeElement.getContext('2d');
  if (!ctx) return;

  Chart.defaults.color = '#e0f2e9';

  const labels = this.dailyWeather.time.map((t: string, index: number) => 
    this.weatherService.getDayName(t, index === 0)
  );

  this.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Темп. (°C)',
          data: this.dailyWeather.temperature_2m_max,
          borderColor: '#40916c',
          backgroundColor: 'rgba(64, 145, 108, 0.2)',
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Осадки (мм)',
          data: this.dailyWeather.precipitation_sum,
          type: 'bar',
          backgroundColor: 'rgba(45, 106, 79, 0.7)',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { 
          display: true, 
          position: 'top',
          labels: {
            color: '#e0f2e9',
            font: {
              size: 12
            }
          }
        } 
      },
      scales: {
        y: { 
          display: true, 
          position: 'left',
          title: {
            display: true,
            text: 'Температура (°C)',
            color: '#e0f2e9',
            font: {
              size: 12
            }
          },
          ticks: {
            color: '#e0f2e9'
          },
          grid: { color: 'rgba(64, 145, 108, 0.2)' } 
        },
        y1: { 
          display: true, 
          position: 'right',
          title: {
            display: true,
            text: 'Осадки (мм)',
            color: '#e0f2e9',
            font: {
              size: 12
            }
          },
          ticks: {
            color: '#e0f2e9'
          },
          grid: { drawOnChartArea: false } 
        }
      }
    }
  });
  
  this.cdr.detectChanges();
}

  getWeatherIcon(code: number): string {
    return this.weatherService.getWeatherIcon(code);
  }

  getWeatherDescription(code: number): string {
    return this.weatherService.getWeatherDescription(code);
  }

  getDayName(dateStr: string, isToday: boolean): string {
    return this.weatherService.getDayName(dateStr, isToday);
  }

  formatPopulation(population: number): string {
    return this.cityService.formatPopulation(population);
  }

  formatTemp(temp: number): string {
    return Math.round(temp).toString();
  }

  formatPrecip(precip: number): string {
    return precip.toFixed(1);
  }
}
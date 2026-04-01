import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WeatherData, DailyWeather } from '../models/city.models';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private baseUrl = 'https://api.open-meteo.com/v1/forecast';

  constructor(private http: HttpClient) {}

  getWeather(lat: number, lon: number): Observable<WeatherData> {
    const url = `${this.baseUrl}?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,wind_speed_10m,relative_humidity_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7`;
    return this.http.get<WeatherData>(url);
  }

  getWeatherIcon(code: number): string {
    const icons: Record<number, string> = {
      0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
      45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️',
      61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '❄️', 73: '❄️', 75: '❄️',
      77: '🌨️', 80: '🌦️', 81: '🌧️', 82: '⛈️', 85: '🌨️', 86: '🌨️',
      95: '⛈️', 96: '⛈️', 99: '⛈️'
    };
    return icons[code] || '🌡️';
  }

  getWeatherDescription(code: number): string {
    const desc: Record<number, string> = {
      0: 'Ясно', 1: 'Малооблачно', 2: 'Переменная облачность', 3: 'Пасмурно',
      45: 'Туман', 48: 'Туман с изморозью', 51: 'Морось', 55: 'Сильная морось',
      61: 'Дождь', 65: 'Сильный дождь', 71: 'Снег', 75: 'Сильный снег',
      80: 'Ливень', 82: 'Сильный ливень', 85: 'Снегопад', 95: 'Гроза'
    };
    return desc[code] || '—';
  }

  getDayName(dateStr: string, isToday: boolean = false): string {
    if (isToday) return 'Сегодня';
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const date = new Date(dateStr);
    return days[date.getDay()];
  }
}
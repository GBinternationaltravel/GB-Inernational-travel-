export interface CurrentWeather {
  locationKey: string;
  locationName: string;
  temperatureC: number;
  /** Alias used by UI copy — same as temperatureC. */
  temperature?: number;
  feelsLikeC: number;
  feelsLike?: number;
  condition: string;
  humidity: number;
  windKph: number;
  wind?: number;
  observedAt: string;
  lastUpdated?: string;
  highC?: number;
  lowC?: number;
}

export interface HourlyForecast {
  time: string;
  temperatureC: number;
  condition: string;
  precipitationChance?: number;
}

export interface DailyForecast {
  date: string;
  highC: number;
  lowC: number;
  condition: string;
  precipitationChance?: number;
}

export interface WeatherForecast {
  locationKey: string;
  locationName: string;
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  providerCode: string;
  /** True when data is sample/mock — UI must not claim live weather. */
  isMock: boolean;
  dataLabel: string;
  travelSummary: string;
}

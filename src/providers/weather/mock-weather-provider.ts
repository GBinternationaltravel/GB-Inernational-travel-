import type { WeatherForecast } from "@/types/weather";
import type { WeatherProvider } from "@/providers/weather/types";
import { mockWeatherByLocation } from "@/data/mock/weather";

/**
 * Development weather provider using static mock snapshots.
 * Never present as live weather.
 */
export class MockWeatherProvider implements WeatherProvider {
  readonly code = "MOCK_WEATHER";
  readonly name = "Mock Weather Provider";
  readonly isMock = true;

  async getForecast(locationKey: string): Promise<WeatherForecast | null> {
    const key = locationKey.toUpperCase();
    const forecast = mockWeatherByLocation[key];
    if (!forecast) return null;
    return {
      ...forecast,
      isMock: true,
      dataLabel: "Sample weather (not live)",
      providerCode: this.code,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

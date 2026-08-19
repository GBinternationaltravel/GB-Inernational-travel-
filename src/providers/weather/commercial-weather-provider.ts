import type { WeatherForecast } from "@/types/weather";
import type { WeatherProvider } from "@/providers/weather/types";

/**
 * @deprecated Prefer OpenWeatherMapProvider. Kept for registry compatibility.
 * Returns null unless credentials exist — does not invent live data.
 */
export class CommercialWeatherProvider implements WeatherProvider {
  readonly code = "COMMERCIAL_WEATHER";
  readonly name = "Commercial Weather API Adapter (deprecated stub)";
  readonly isMock = false;

  async getForecast(_locationKey?: string): Promise<WeatherForecast | null> {
    void _locationKey;
    return null;
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}

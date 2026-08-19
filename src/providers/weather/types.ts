import type { WeatherForecast } from "@/types/weather";

/**
 * WeatherProvider abstraction.
 * Connect a licensed commercial weather API later without changing callers.
 */
export interface WeatherProvider {
  readonly code: string;
  readonly name: string;
  /** True when this provider returns sample/demo data only. */
  readonly isMock: boolean;

  getForecast(locationKey: string): Promise<WeatherForecast | null>;
  healthCheck?(): Promise<boolean>;
}

import type { WeatherForecast } from "@/types/weather";
import type { WeatherProvider } from "@/providers/weather/types";
import { getWeatherEnv } from "@/config/weather";
import { SlidingWindowRateLimiter, TtlCache } from "@/lib/weather/cache";
import {
  normalizeOpenWeatherForecast,
  resolveWeatherQuery,
  safeWeatherErrorMessage,
} from "@/lib/weather/normalize";

/**
 * OpenWeatherMap adapter (selected Phase 9A weather provider).
 * Server-side API key only — never NEXT_PUBLIC_*.
 */
export class OpenWeatherMapProvider implements WeatherProvider {
  readonly code = "OPENWEATHER";
  readonly name = "OpenWeatherMap";
  readonly isMock = false;

  private readonly cache: TtlCache<WeatherForecast>;
  private readonly limiter: SlidingWindowRateLimiter;

  constructor() {
    const env = getWeatherEnv();
    this.cache = new TtlCache<WeatherForecast>(env.cacheTtlSeconds * 1000);
    this.limiter = new SlidingWindowRateLimiter(
      env.maxRequestsPerMinute,
      60_000,
    );
  }

  async getForecast(locationKey: string): Promise<WeatherForecast | null> {
    const env = getWeatherEnv();
    if (!env.apiKey) return null;

    const resolved = resolveWeatherQuery(locationKey);
    const cacheKey = resolved.locationKey.toUpperCase();
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (!this.limiter.tryAcquire()) {
      console.warn("[weather:openweather] rate limit reached");
      return null;
    }

    try {
      const current = await this.fetchJson(
        `${env.baseUrl}/weather?q=${encodeURIComponent(resolved.q)}&units=metric&appid=${env.apiKey}`,
        env.timeoutMs,
      );
      let forecast: unknown = null;
      try {
        forecast = await this.fetchJson(
          `${env.baseUrl}/forecast?q=${encodeURIComponent(resolved.q)}&units=metric&appid=${env.apiKey}`,
          env.timeoutMs,
        );
      } catch {
        forecast = null;
      }

      const normalized = normalizeOpenWeatherForecast({
        locationKey: resolved.locationKey,
        locationName: resolved.locationName,
        current: current as Parameters<typeof normalizeOpenWeatherForecast>[0]["current"],
        forecast: forecast as Parameters<typeof normalizeOpenWeatherForecast>[0]["forecast"],
      });

      this.cache.set(cacheKey, normalized);
      return normalized;
    } catch (error) {
      console.warn("[weather:openweather] request failed", {
        locationKey: resolved.locationKey,
        error: safeWeatherErrorMessage(error),
      });
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    const env = getWeatherEnv();
    return Boolean(env.apiKey);
  }

  private async fetchJson(url: string, timeoutMs: number): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`WEATHER_HTTP_${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

/** @deprecated Use OpenWeatherMapProvider — kept as alias for Phase 8 imports. */
export { OpenWeatherMapProvider as CommercialWeatherProvider };

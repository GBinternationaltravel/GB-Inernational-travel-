import { getWeatherProvider } from "@/providers/registry";
import type { WeatherForecast } from "@/types/weather";
import { getWeatherEnv } from "@/config/weather";

export async function getDestinationWeather(
  locationKey: string,
): Promise<WeatherForecast | null> {
  const provider = getWeatherProvider();
  const env = getWeatherEnv();

  try {
    const forecast = await provider.getForecast(locationKey);
    if (!forecast) {
      return null;
    }

    const current = {
      ...forecast.current,
      temperature: forecast.current.temperatureC,
      feelsLike: forecast.current.feelsLikeC,
      wind: forecast.current.windKph,
      lastUpdated: forecast.current.lastUpdated ?? forecast.current.observedAt,
    };

    if (provider.isMock || env.mode === "mock") {
      return {
        ...forecast,
        current,
        isMock: true,
        dataLabel: forecast.dataLabel || "Sample weather (not live)",
        providerCode: provider.code,
      };
    }

    return {
      ...forecast,
      current,
      isMock: false,
      dataLabel: forecast.dataLabel || "Live weather",
      providerCode: provider.code,
    };
  } catch {
    // Never expose provider internals or API keys to callers.
    return null;
  }
}

export function weatherIsLive(forecast: WeatherForecast | null): boolean {
  return Boolean(forecast && !forecast.isMock);
}

export function getWeatherProviderStatus() {
  const env = getWeatherEnv();
  return {
    mode: env.mode,
    configuredMode: env.configuredMode,
    liveConfigured: env.useLive,
  };
}

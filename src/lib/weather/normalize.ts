import type { WeatherForecast } from "@/types/weather";
import { getCityByIata } from "@/data/destinations/catalog";

type OpenWeatherCurrentResponse = {
  name?: string;
  weather?: Array<{ main?: string; description?: string }>;
  main?: {
    temp?: number;
    feels_like?: number;
    temp_min?: number;
    temp_max?: number;
    humidity?: number;
  };
  wind?: { speed?: number };
  dt?: number;
};

type OpenWeatherForecastResponse = {
  list?: Array<{
    dt?: number;
    main?: { temp?: number; temp_min?: number; temp_max?: number };
    weather?: Array<{ description?: string }>;
    pop?: number;
  }>;
};

export function resolveWeatherQuery(locationKey: string): {
  q: string;
  locationName: string;
  locationKey: string;
} {
  const key = locationKey.trim().toUpperCase();
  const city = getCityByIata(key);
  if (city) {
    return {
      q: `${city.cityName},${city.countryName}`,
      locationName: city.cityName,
      locationKey: key,
    };
  }
  return {
    q: locationKey.trim(),
    locationName: locationKey.trim(),
    locationKey: key || locationKey.trim().toUpperCase(),
  };
}

function travelSummary(
  locationName: string,
  temperatureC: number,
  condition: string,
  highC: number,
  lowC: number,
): string {
  if (temperatureC >= 36) {
    return `${locationName}: hot conditions around ${temperatureC}°C (${condition}). Pack light clothing. Daily range roughly ${lowC}–${highC}°C.`;
  }
  if (temperatureC <= 12) {
    return `${locationName}: cooler conditions near ${temperatureC}°C (${condition}). Bring layers. Expected range ${lowC}–${highC}°C.`;
  }
  return `${locationName}: around ${temperatureC}°C with ${condition.toLowerCase()}. Typical daily range ${lowC}–${highC}°C.`;
}

export function normalizeOpenWeatherForecast(input: {
  locationKey: string;
  locationName: string;
  current: OpenWeatherCurrentResponse;
  forecast?: OpenWeatherForecastResponse | null;
}): WeatherForecast {
  const temperatureC = Math.round(input.current.main?.temp ?? 0);
  const feelsLikeC = Math.round(input.current.main?.feels_like ?? temperatureC);
  const condition =
    input.current.weather?.[0]?.description ??
    input.current.weather?.[0]?.main ??
    "Unknown";
  const highC = Math.round(
    input.current.main?.temp_max ?? temperatureC + 2,
  );
  const lowC = Math.round(
    input.current.main?.temp_min ?? temperatureC - 3,
  );
  const observedAt = input.current.dt
    ? new Date(input.current.dt * 1000).toISOString()
    : new Date().toISOString();

  const hourly =
    input.forecast?.list?.slice(0, 6).map((item) => ({
      time: item.dt
        ? new Date(item.dt * 1000).toISOString()
        : new Date().toISOString(),
      temperatureC: Math.round(item.main?.temp ?? temperatureC),
      condition: item.weather?.[0]?.description ?? condition,
      precipitationChance:
        typeof item.pop === "number" ? Math.round(item.pop * 100) : undefined,
    })) ?? [];

  const byDay = new Map<
    string,
    { highC: number; lowC: number; condition: string; pop?: number }
  >();
  for (const item of input.forecast?.list ?? []) {
    if (!item.dt) continue;
    const date = new Date(item.dt * 1000).toISOString().slice(0, 10);
    const existing = byDay.get(date);
    const dayHigh = Math.round(item.main?.temp_max ?? item.main?.temp ?? temperatureC);
    const dayLow = Math.round(item.main?.temp_min ?? item.main?.temp ?? temperatureC);
    if (!existing) {
      byDay.set(date, {
        highC: dayHigh,
        lowC: dayLow,
        condition: item.weather?.[0]?.description ?? condition,
        pop: typeof item.pop === "number" ? Math.round(item.pop * 100) : undefined,
      });
    } else {
      existing.highC = Math.max(existing.highC, dayHigh);
      existing.lowC = Math.min(existing.lowC, dayLow);
    }
  }

  const daily = Array.from(byDay.entries())
    .slice(0, 5)
    .map(([date, day]) => ({
      date,
      highC: day.highC,
      lowC: day.lowC,
      condition: day.condition,
      precipitationChance: day.pop,
    }));

  if (daily.length === 0) {
    daily.push({
      date: observedAt.slice(0, 10),
      highC,
      lowC,
      condition,
      precipitationChance: undefined,
    });
  }

  return {
    locationKey: input.locationKey,
    locationName: input.locationName || input.current.name || input.locationKey,
    providerCode: "OPENWEATHER",
    isMock: false,
    dataLabel: "Live weather",
    travelSummary: travelSummary(
      input.locationName || input.current.name || input.locationKey,
      temperatureC,
      condition,
      highC,
      lowC,
    ),
    current: {
      locationKey: input.locationKey,
      locationName: input.locationName || input.current.name || input.locationKey,
      temperatureC,
      feelsLikeC,
      condition,
      humidity: Math.round(input.current.main?.humidity ?? 0),
      windKph: Math.round((input.current.wind?.speed ?? 0) * 3.6),
      observedAt,
      highC,
      lowC,
    },
    hourly,
    daily,
  };
}

/** Redact secrets from provider error text before logging/UI. */
export function safeWeatherErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/appid=[^&\s]+/gi, "appid=[REDACTED]")
    .replace(/api[_-]?key[=:][^\s&]+/gi, "api_key=[REDACTED]")
    .slice(0, 180);
}

import type { WeatherForecast } from "@/types/weather";

/**
 * Static mock weather snapshots for development UI only.
 * Not live observations — UI must label these as sample/mock data.
 */

function travelSummary(
  locationName: string,
  temperatureC: number,
  condition: string,
  highC: number,
  lowC: number,
): string {
  if (temperatureC >= 36) {
    return `${locationName}: expect hot conditions around ${temperatureC}°C (${condition}). Pack light clothing and plan indoor midday activities. Daily range roughly ${lowC}–${highC}°C.`;
  }
  if (temperatureC <= 12) {
    return `${locationName}: cooler conditions near ${temperatureC}°C (${condition}). Bring layers. Expected range ${lowC}–${highC}°C.`;
  }
  return `${locationName}: around ${temperatureC}°C with ${condition.toLowerCase()}. Typical daily range ${lowC}–${highC}°C — useful for packing, not for operational flight decisions.`;
}

function buildMockForecast(
  locationKey: string,
  locationName: string,
  temperatureC: number,
  condition: string,
): WeatherForecast {
  const observedAt = "2026-08-11T12:00:00+05:00";
  const highC = temperatureC + 3;
  const lowC = temperatureC - 5;

  return {
    locationKey,
    locationName,
    providerCode: "MOCK_WEATHER",
    isMock: true,
    dataLabel: "Sample weather (not live)",
    travelSummary: travelSummary(locationName, temperatureC, condition, highC, lowC),
    current: {
      locationKey,
      locationName,
      temperatureC,
      feelsLikeC: temperatureC + 1,
      condition,
      humidity: 55,
      windKph: 12,
      observedAt,
      highC,
      lowC,
    },
    hourly: [
      {
        time: "2026-08-11T13:00:00+05:00",
        temperatureC: temperatureC + 1,
        condition,
        precipitationChance: 10,
      },
      {
        time: "2026-08-11T14:00:00+05:00",
        temperatureC: temperatureC + 2,
        condition,
        precipitationChance: 15,
      },
    ],
    daily: [
      {
        date: "2026-08-11",
        highC,
        lowC,
        condition,
        precipitationChance: 20,
      },
      {
        date: "2026-08-12",
        highC: temperatureC + 2,
        lowC: temperatureC - 4,
        condition: "Partly cloudy",
        precipitationChance: 25,
      },
    ],
  };
}

export const mockWeatherByLocation: Record<string, WeatherForecast> = {
  KHI: buildMockForecast("KHI", "Karachi", 32, "Clear"),
  LHE: buildMockForecast("LHE", "Lahore", 34, "Haze"),
  ISB: buildMockForecast("ISB", "Islamabad", 30, "Partly cloudy"),
  MUX: buildMockForecast("MUX", "Multan", 35, "Sunny"),
  PEW: buildMockForecast("PEW", "Peshawar", 31, "Clear"),
  DXB: buildMockForecast("DXB", "Dubai", 38, "Sunny"),
  AUH: buildMockForecast("AUH", "Abu Dhabi", 37, "Clear"),
  DOH: buildMockForecast("DOH", "Doha", 36, "Sunny"),
  RUH: buildMockForecast("RUH", "Riyadh", 39, "Clear"),
  JED: buildMockForecast("JED", "Jeddah", 36, "Clear"),
  IST: buildMockForecast("IST", "Istanbul", 27, "Cloudy"),
  LHR: buildMockForecast("LHR", "London", 18, "Partly cloudy"),
  KUL: buildMockForecast("KUL", "Kuala Lumpur", 31, "Showers"),
  BKK: buildMockForecast("BKK", "Bangkok", 33, "Humid"),
  SIN: buildMockForecast("SIN", "Singapore", 30, "Thunderstorms nearby"),
  JFK: buildMockForecast("JFK", "New York", 24, "Partly cloudy"),
  YYZ: buildMockForecast("YYZ", "Toronto", 22, "Cloudy"),
};

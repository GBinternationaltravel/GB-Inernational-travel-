/**
 * Phase 9B OpenWeatherMap verification (presence + optional live calls).
 * Never prints API keys.
 *
 * Usage: npx tsx scripts/verify-weather-9b.ts
 */
import { getWeatherEnv } from "../src/config/weather";
import { OpenWeatherMapProvider } from "../src/providers/weather/openweather-provider";
import { MockWeatherProvider } from "../src/providers/weather/mock-weather-provider";
import { setWeatherProvider } from "../src/providers/registry";
import { getDestinationWeather } from "../src/services/weather-service";

const CITIES = [
  "ISB",
  "LHE",
  "KHI",
  "DXB",
  "AUH",
  "DOH",
  "RUH",
  "JED",
  "IST",
  "LHR",
] as const;

async function main() {
  const env = getWeatherEnv();
  console.info("[verify:weather]", {
    requestedProvider: env.requestedProvider,
    activeMode: env.mode,
    hasCredentials: env.hasCredentials,
    useLive: env.useLive,
  });

  if (!env.useLive) {
    setWeatherProvider(new MockWeatherProvider());
    const sample = await getDestinationWeather("ISB");
    console.info("[verify:weather] LIVE_VERIFICATION=SKIPPED (credentials/provider missing)");
    console.info("[verify:weather] mockFallback", {
      location: sample?.locationName,
      isMock: sample?.isMock,
      dataLabel: sample?.dataLabel,
    });
    return;
  }

  setWeatherProvider(new OpenWeatherMapProvider());
  const results: Array<Record<string, unknown>> = [];
  for (const code of CITIES) {
    const forecast = await getDestinationWeather(code);
    results.push({
      iata: code,
      ok: Boolean(forecast && !forecast.isMock),
      isMock: forecast?.isMock ?? null,
      tempC: forecast?.current.temperatureC ?? null,
      condition: forecast?.current.condition ?? null,
      label: forecast?.dataLabel ?? null,
    });
  }
  console.info("[verify:weather] LIVE_VERIFICATION=ATTEMPTED");
  console.info(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error("[verify:weather] failed", error instanceof Error ? error.message : "unknown");
  process.exitCode = 1;
});

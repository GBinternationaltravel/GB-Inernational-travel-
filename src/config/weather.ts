export type WeatherProviderMode = "mock" | "openweather";

export function getWeatherEnv() {
  const modeRaw = (process.env.WEATHER_PROVIDER ?? "mock").trim().toLowerCase();
  // Accept openweather + openweathermap aliases from docs/env examples.
  const mode: WeatherProviderMode =
    modeRaw === "openweather" || modeRaw === "openweathermap"
      ? "openweather"
      : "mock";
  const apiKey = process.env.WEATHER_API_KEY?.trim() || "";
  const baseUrl = (
    process.env.WEATHER_BASE_URL?.trim() ||
    "https://api.openweathermap.org/data/2.5"
  ).replace(/\/$/, "");
  const timeoutMs = Number(process.env.WEATHER_TIMEOUT_MS ?? "8000");
  const cacheTtlSeconds = Number(process.env.WEATHER_CACHE_TTL_SECONDS ?? "1800");
  const maxRequestsPerMinute = Number(
    process.env.WEATHER_MAX_REQUESTS_PER_MINUTE ?? "30",
  );

  const hasCredentials = Boolean(apiKey);
  const useLive = mode === "openweather" && hasCredentials;

  return {
    mode: useLive ? ("openweather" as const) : ("mock" as const),
    configuredMode: mode,
    requestedProvider: modeRaw || "mock",
    apiKey,
    baseUrl,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 8000,
    cacheTtlSeconds: Number.isFinite(cacheTtlSeconds) ? cacheTtlSeconds : 1800,
    maxRequestsPerMinute: Number.isFinite(maxRequestsPerMinute)
      ? maxRequestsPerMinute
      : 30,
    hasCredentials,
    useLive,
  };
}

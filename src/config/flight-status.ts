export type FlightStatusProviderMode = "mock" | "aviationstack";

export function getFlightStatusEnv() {
  const modeRaw = (
    process.env.FLIGHT_STATUS_PROVIDER ??
    (process.env.FLIGHT_STATUS_API_ENABLED === "true" ? "aviationstack" : "mock")
  )
    .trim()
    .toLowerCase();

  const mode: FlightStatusProviderMode =
    modeRaw === "aviationstack" ? "aviationstack" : "mock";
  const apiKey = process.env.FLIGHT_STATUS_API_KEY?.trim() || "";
  const baseUrl = (
    process.env.FLIGHT_STATUS_BASE_URL?.trim() ||
    "http://api.aviationstack.com/v1"
  ).replace(/\/$/, "");
  const timeoutMs = Number(process.env.FLIGHT_STATUS_TIMEOUT_MS ?? "8000");
  const hasCredentials = Boolean(apiKey);
  const useLive = mode === "aviationstack" && hasCredentials;

  return {
    mode: useLive ? ("aviationstack" as const) : ("mock" as const),
    configuredMode: mode,
    requestedProvider: modeRaw || "mock",
    apiKey,
    baseUrl,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 8000,
    hasCredentials,
    useLive,
    notConfigured: mode === "aviationstack" && !hasCredentials,
  };
}

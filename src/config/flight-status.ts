export type FlightStatusProviderMode = "mock" | "aviationstack" | "aerodatabox";

export function getFlightStatusEnv() {
  const modeRaw = (
    process.env.FLIGHT_STATUS_PROVIDER ??
    (process.env.FLIGHT_STATUS_API_ENABLED === "true" ? "aviationstack" : "mock")
  )
    .trim()
    .toLowerCase();

  const mode: FlightStatusProviderMode =
    modeRaw === "aviationstack" || modeRaw === "aerodatabox" ? modeRaw : "mock";
  const apiKey = process.env.FLIGHT_STATUS_API_KEY?.trim() || "";
  const defaultBase =
    mode === "aerodatabox"
      ? "https://aerodatabox.p.rapidapi.com"
      : "http://api.aviationstack.com/v1";
  const baseUrl = (process.env.FLIGHT_STATUS_BASE_URL?.trim() || defaultBase).replace(/\/$/, "");
  const timeoutMs = Number(process.env.FLIGHT_STATUS_TIMEOUT_MS ?? "8000");
  const hasCredentials = Boolean(apiKey);
  const commercial = mode === "aviationstack" || mode === "aerodatabox";
  const useLive = commercial && hasCredentials;

  return {
    mode: useLive ? mode : ("mock" as const),
    configuredMode: mode,
    requestedProvider: modeRaw || "mock",
    apiKey,
    baseUrl,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 8000,
    hasCredentials,
    useLive,
    notConfigured: commercial && !hasCredentials,
  };
}

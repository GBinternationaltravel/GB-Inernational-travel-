/**
 * Travelport TripServices configuration.
 * Docs: https://developer.travelport.com/docs/getting-started/authentication
 * Flights endpoints: https://developer.travelport.com/docs/flights/general/flights-api-endpoints
 *
 * Secrets must never use NEXT_PUBLIC_*.
 */

export type FlightSupplierCode = "mock" | "travelport";

export type TravelportEnvironment = "sandbox" | "production";

export function getFlightSupplierEnv() {
  const raw = (process.env.FLIGHT_SUPPLIER ?? "mock").toLowerCase().trim();
  const activeSupplier: FlightSupplierCode =
    raw === "travelport" ? "travelport" : "mock";

  const environmentRaw = (
    process.env.TRAVELPORT_ENVIRONMENT ?? "sandbox"
  ).toLowerCase();
  /**
   * Phase 11: Travelport production airline APIs remain blocked.
   * Always operate against sandbox/pre-production configuration.
   */
  const productionRequested = environmentRaw === "production";
  if (productionRequested) {
    console.warn(
      "[travelport] TRAVELPORT_ENVIRONMENT=production is blocked in Phase 11 — forcing sandbox/pre-production.",
    );
  }
  const environment: TravelportEnvironment = "sandbox";

  const authUrl =
    process.env.TRAVELPORT_AUTH_URL?.trim() ||
    "https://auth.pp.travelport.net/oauth/token";

  const baseUrl =
    process.env.TRAVELPORT_BASE_URL?.trim() ||
    "https://api.pp.travelport.net/11/air";

  const clientId = process.env.TRAVELPORT_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.TRAVELPORT_CLIENT_SECRET?.trim() ?? "";
  const username = process.env.TRAVELPORT_USERNAME?.trim() ?? "";
  const password = process.env.TRAVELPORT_PASSWORD?.trim() ?? "";
  const accessGroup =
    process.env.TRAVELPORT_ACCESS_GROUP?.trim() ||
    process.env.TRAVELPORT_TARGET_BRANCH?.trim() ||
    "";
  const pcc = process.env.TRAVELPORT_PCC?.trim() ?? "";
  const gds = (process.env.TRAVELPORT_GDS?.trim() || "1G").toUpperCase();
  const apiVersion = process.env.TRAVELPORT_API_VERSION?.trim() || "11";

  const hasCredentials = Boolean(
    clientId && clientSecret && username && password && (accessGroup || pcc),
  );

  /**
   * Phase 7C: never silently serve mock results when Travelport is selected.
   * Explicit opt-in only via TRAVELPORT_ALLOW_MOCK_FALLBACK=true.
   */
  const allowMockFallback =
    process.env.TRAVELPORT_ALLOW_MOCK_FALLBACK === "true";
  const requireTravelport =
    process.env.TRAVELPORT_REQUIRE_CREDENTIALS === "true" ||
    process.env.TRAVELPORT_STRICT === "true" ||
    !allowMockFallback;

  /** Phase 7D: sandbox booking is opt-in only; never implied by credentials alone. */
  const enableSandboxBooking =
    process.env.TRAVELPORT_ENABLE_SANDBOX_BOOKING === "true";
  /** Phase 11: production and sandbox customer ticketing remain disabled. */
  const enableSandboxTicketing = false;

  return {
    activeSupplier,
    mockSimulate: {
      noAvailability: process.env.MOCK_FLIGHT_NO_AVAILABILITY === "true",
      forceExpire: process.env.MOCK_FLIGHT_FORCE_EXPIRE === "true",
      priceChange: process.env.MOCK_FLIGHT_PRICE_CHANGE === "true",
      timeout: process.env.MOCK_FLIGHT_TIMEOUT === "true",
    },
    travelport: {
      environment,
      authUrl,
      baseUrl: baseUrl.replace(/\/$/, ""),
      clientId,
      clientSecret,
      username,
      password,
      accessGroup,
      pcc,
      gds,
      apiVersion,
      hasCredentials,
      requireTravelport,
      allowMockFallback,
      enableSandboxBooking,
      enableSandboxTicketing,
      productionRequested,
      productionBlocked: true,
      /** Phase 7C/7D/11: production Travelport must not be used for live charging/ticketing. */
      isSandbox: true,
    },
  };
}

export function travelportConfigured(): boolean {
  return getFlightSupplierEnv().travelport.hasCredentials;
}

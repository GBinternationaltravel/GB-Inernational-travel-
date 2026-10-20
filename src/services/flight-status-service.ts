import { getFlightStatusProvider } from "@/providers/registry";
import { getFlightStatusEnv } from "@/config/flight-status";
import type {
  BookingFlightStatusContext,
  FlightStatusLookupInput,
  FlightStatusSnapshot,
} from "@/types/flight-status";

export function getFlightStatusProviderStatus() {
  const env = getFlightStatusEnv();
  const provider = getFlightStatusProvider();
  return {
    providerCode: provider.code,
    isMock: provider.isMock,
    useLive: env.useLive,
    notConfigured: env.notConfigured,
    configuredMode: env.configuredMode,
    label: env.useLive
      ? "Live flight status"
      : env.notConfigured
        ? "NOT_CONFIGURED"
        : "Sample / mock flight status",
  };
}

const statusCache = new Map<string, { at: number; value: FlightStatusSnapshot | null }>();
const STATUS_CACHE_MS = 90_000;

export async function lookupFlightStatus(
  input: FlightStatusLookupInput,
): Promise<FlightStatusSnapshot | null> {
  const provider = getFlightStatusProvider();
  const env = getFlightStatusEnv();
  const cacheKey = `${provider.code}:${input.flightNumber}:${input.date ?? ""}:${input.origin ?? ""}:${input.destination ?? ""}`;
  const cached = statusCache.get(cacheKey);
  if (cached && Date.now() - cached.at < STATUS_CACHE_MS) return cached.value;

  const result = await provider.lookup(input);
  if (!result) {
    statusCache.set(cacheKey, { at: Date.now(), value: null });
    return null;
  }

  const snapshot: FlightStatusSnapshot = provider.isMock
    ? {
        ...result,
        isMock: true,
        dataLabel: result.dataLabel || "Sample flight status (not live)",
        providerCode: provider.code,
      }
    : {
        ...result,
        isMock: false,
        dataLabel: result.dataLabel || "Provider status",
        providerCode: provider.code || env.configuredMode.toUpperCase(),
      };
  statusCache.set(cacheKey, { at: Date.now(), value: snapshot });
  return snapshot;
}

/** Public lookup. A mock provider never supplies gates, delays, or a status. */
export async function lookupPublicFlightStatus(
  input: FlightStatusLookupInput,
): Promise<FlightStatusSnapshot | null> {
  const env = getFlightStatusEnv();
  if (!env.useLive) return null;
  const snapshot = await lookupFlightStatus(input);
  if (!snapshot || snapshot.isMock) return null;
  return snapshot;
}

export async function getBookingFlightStatus(
  context: BookingFlightStatusContext,
): Promise<FlightStatusSnapshot> {
  const env = getFlightStatusEnv();
  const lookedUp = await lookupFlightStatus({
    flightNumber: context.flightNumber,
    origin: context.origin,
    destination: context.destination,
    date: context.departureAt,
  });

  if (lookedUp) {
    return {
      ...lookedUp,
      origin: lookedUp.origin !== "—" ? lookedUp.origin : context.origin,
      destination:
        lookedUp.destination !== "—" ? lookedUp.destination : context.destination,
      departureAt: lookedUp.departureAt ?? context.departureAt,
      arrivalAt: lookedUp.arrivalAt ?? context.arrivalAt,
    };
  }

  if (env.notConfigured || env.configuredMode === "aviationstack") {
    return {
      flightNumber: context.flightNumber,
      origin: context.origin,
      destination: context.destination,
      departureAt: context.departureAt,
      arrivalAt: context.arrivalAt,
      status: "NOT_AVAILABLE",
      statusLabel: "Flight status provider not configured",
      providerCode: "NOT_CONFIGURED",
      isMock: true,
      dataLabel: "NOT_CONFIGURED — no live status",
      notice:
        "A flight-status provider is selected but has no API key. Scheduled times from your booking are shown for reference only. Live status is never invented.",
      checkedAt: new Date().toISOString(),
    };
  }

  return {
    flightNumber: context.flightNumber,
    origin: context.origin,
    destination: context.destination,
    departureAt: context.departureAt,
    arrivalAt: context.arrivalAt,
    status: "NOT_AVAILABLE",
    statusLabel: "Live status not available",
    providerCode: "NONE",
    isMock: true,
    dataLabel: "Flight status unavailable",
    notice:
      "A live flight-status source is not connected yet. Scheduled times from your booking are shown for reference only.",
    checkedAt: new Date().toISOString(),
  };
}

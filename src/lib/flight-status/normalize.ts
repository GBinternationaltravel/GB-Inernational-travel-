import type {
  FlightStatusCode,
  FlightStatusSnapshot,
} from "@/types/flight-status";

type AviationStackFlight = {
  flight_date?: string;
  flight_status?: string;
  departure?: {
    iata?: string;
    scheduled?: string;
    estimated?: string;
    actual?: string;
    delay?: number | null;
    terminal?: string | null;
    gate?: string | null;
  };
  arrival?: {
    iata?: string;
    scheduled?: string;
    estimated?: string;
    actual?: string;
    delay?: number | null;
    terminal?: string | null;
    gate?: string | null;
  };
  airline?: { iata?: string; name?: string };
  flight?: { iata?: string; number?: string };
};

export function mapAviationStackStatus(raw?: string): {
  status: FlightStatusCode;
  statusLabel: string;
} {
  const value = (raw ?? "").toLowerCase();
  if (value === "scheduled") return { status: "SCHEDULED", statusLabel: "Scheduled" };
  if (value === "active") return { status: "DEPARTED", statusLabel: "In air / departed" };
  if (value === "landed") return { status: "LANDED", statusLabel: "Landed" };
  if (value === "cancelled") return { status: "CANCELLED", statusLabel: "Cancelled" };
  if (value === "incident" || value === "diverted") {
    return { status: "UNKNOWN", statusLabel: raw ?? "Unknown" };
  }
  if (!value) return { status: "NOT_AVAILABLE", statusLabel: "Status not available" };
  return { status: "UNKNOWN", statusLabel: raw ?? "Unknown" };
}

export function normalizeAviationStackFlight(input: {
  flightNumber: string;
  row: AviationStackFlight;
}): FlightStatusSnapshot {
  const mapped = mapAviationStackStatus(input.row.flight_status);
  const delayMinutes =
    typeof input.row.departure?.delay === "number"
      ? input.row.departure.delay
      : typeof input.row.arrival?.delay === "number"
        ? input.row.arrival.delay
        : undefined;

  const status =
    delayMinutes && delayMinutes > 0 && mapped.status === "SCHEDULED"
      ? ("DELAYED" as const)
      : mapped.status;

  return {
    flightNumber:
      input.row.flight?.iata?.toUpperCase() ?? input.flightNumber.toUpperCase(),
    airlineCode: input.row.airline?.iata?.toUpperCase(),
    origin: input.row.departure?.iata?.toUpperCase() ?? "—",
    destination: input.row.arrival?.iata?.toUpperCase() ?? "—",
    departureAt:
      input.row.departure?.actual ??
      input.row.departure?.estimated ??
      input.row.departure?.scheduled,
    arrivalAt:
      input.row.arrival?.actual ??
      input.row.arrival?.estimated ??
      input.row.arrival?.scheduled,
    status,
    statusLabel:
      status === "DELAYED"
        ? `Delayed${delayMinutes ? ` (${delayMinutes} min)` : ""}`
        : mapped.statusLabel,
    gate: input.row.departure?.gate ?? undefined,
    terminal: input.row.departure?.terminal ?? undefined,
    delayMinutes,
    providerCode: "AVIATIONSTACK",
    isMock: false,
    dataLabel: "Live flight status",
    notice: "Status provided by the configured flight-status API.",
    checkedAt: new Date().toISOString(),
  };
}

export function safeFlightStatusError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/access_key=[^&\s]+/gi, "access_key=[REDACTED]")
    .replace(/api[_-]?key[=:][^\s&]+/gi, "api_key=[REDACTED]")
    .slice(0, 180);
}

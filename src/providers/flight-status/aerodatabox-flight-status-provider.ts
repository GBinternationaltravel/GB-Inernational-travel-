import type {
  FlightStatusLookupInput,
  FlightStatusSnapshot,
} from "@/types/flight-status";
import type { FlightStatusProvider } from "@/providers/flight-status/types";
import { getFlightStatusEnv } from "@/config/flight-status";
import { safeFlightStatusError } from "@/lib/flight-status/normalize";

type AeroFlight = {
  status?: string;
  departure?: {
    airport?: { iata?: string };
    scheduledTime?: { utc?: string };
    revisedTime?: { utc?: string };
  };
  arrival?: {
    airport?: { iata?: string };
    scheduledTime?: { utc?: string };
    revisedTime?: { utc?: string };
  };
};

function mapStatus(raw?: string): { status: FlightStatusSnapshot["status"]; statusLabel: string } {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("cancel")) return { status: "CANCELLED", statusLabel: "Cancelled" };
  if (value.includes("land") || value.includes("arriv")) return { status: "LANDED", statusLabel: "Landed" };
  if (value.includes("depart") || value.includes("air")) return { status: "DEPARTED", statusLabel: "Departed" };
  if (value.includes("expect") || value.includes("schedul")) {
    return { status: "SCHEDULED", statusLabel: "Scheduled" };
  }
  return { status: "UNKNOWN", statusLabel: raw?.trim() || "Status not stated" };
}

/**
 * AeroDataBox via RapidAPI. The key stays on the server.
 * Unknown fields are left blank. A failed call does not invent a status.
 */
export class AeroDataBoxFlightStatusProvider implements FlightStatusProvider {
  readonly code = "AERODATABOX";
  readonly name = "AeroDataBox Flight Status";
  readonly isMock = false;

  async lookup(input: FlightStatusLookupInput): Promise<FlightStatusSnapshot | null> {
    const env = getFlightStatusEnv();
    if (!env.apiKey) return null;
    const flightNumber = input.flightNumber.trim().toUpperCase().replace(/\s+/g, "");
    if (!flightNumber) return null;
    const date = (input.date ?? new Date().toISOString()).slice(0, 10);
    const host = process.env.FLIGHT_STATUS_RAPIDAPI_HOST?.trim() || "aerodatabox.p.rapidapi.com";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.timeoutMs);
    try {
      const response = await fetch(
        `${env.baseUrl}/flights/number/${encodeURIComponent(flightNumber)}/${date}`,
        {
          method: "GET",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "X-RapidAPI-Key": env.apiKey,
            "X-RapidAPI-Host": host,
          },
        },
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as AeroFlight[] | { flights?: AeroFlight[] };
      const row = Array.isArray(payload) ? payload[0] : payload.flights?.[0];
      if (!row) return null;
      const mapped = mapStatus(row.status);
      return {
        flightNumber,
        origin: row.departure?.airport?.iata ?? input.origin ?? "—",
        destination: row.arrival?.airport?.iata ?? input.destination ?? "—",
        departureAt: row.departure?.revisedTime?.utc ?? row.departure?.scheduledTime?.utc,
        arrivalAt: row.arrival?.revisedTime?.utc ?? row.arrival?.scheduledTime?.utc,
        status: mapped.status,
        statusLabel: mapped.statusLabel,
        providerCode: this.code,
        isMock: false,
        dataLabel: "Provider status",
        notice:
          "Status comes from the connected flight-status provider. It can change, and it is not a ticket or a boarding pass.",
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("[flight-status:aerodatabox] request failed", {
        flightNumber,
        error: safeFlightStatusError(error),
      });
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async healthCheck(): Promise<boolean> {
    return getFlightStatusEnv().hasCredentials;
  }
}

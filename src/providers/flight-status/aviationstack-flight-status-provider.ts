import type {
  FlightStatusLookupInput,
  FlightStatusSnapshot,
} from "@/types/flight-status";
import type { FlightStatusProvider } from "@/providers/flight-status/types";
import { getFlightStatusEnv } from "@/config/flight-status";
import {
  normalizeAviationStackFlight,
  safeFlightStatusError,
} from "@/lib/flight-status/normalize";

/**
 * AviationStack flight-status adapter (selected Phase 10 provider).
 * Server-side API key only. Never fabricates gates/delays.
 */
export class AviationStackFlightStatusProvider implements FlightStatusProvider {
  readonly code = "AVIATIONSTACK";
  readonly name = "AviationStack Flight Status";
  readonly isMock = false;

  async lookup(input: FlightStatusLookupInput): Promise<FlightStatusSnapshot | null> {
    const env = getFlightStatusEnv();
    if (!env.apiKey) return null;

    const flightNumber = input.flightNumber.trim().toUpperCase().replace(/\s+/g, "");
    if (!flightNumber) return null;

    const params = new URLSearchParams({
      access_key: env.apiKey,
      flight_iata: flightNumber,
      limit: "1",
    });
    if (input.date) params.set("flight_date", input.date.slice(0, 10));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.timeoutMs);
    try {
      const response = await fetch(`${env.baseUrl}/flights?${params.toString()}`, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`FLIGHT_STATUS_HTTP_${response.status}`);
      }
      const payload = (await response.json()) as {
        data?: Array<Parameters<typeof normalizeAviationStackFlight>[0]["row"]>;
        error?: { code?: string; message?: string };
      };
      if (payload.error) {
        throw new Error(payload.error.code ?? "FLIGHT_STATUS_PROVIDER_ERROR");
      }
      const row = payload.data?.[0];
      if (!row) return null;
      return normalizeAviationStackFlight({ flightNumber, row });
    } catch (error) {
      console.warn("[flight-status:aviationstack] request failed", {
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

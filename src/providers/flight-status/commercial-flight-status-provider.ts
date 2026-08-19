import type {
  FlightStatusLookupInput,
  FlightStatusSnapshot,
} from "@/types/flight-status";
import type { FlightStatusProvider } from "@/providers/flight-status/types";
import { AviationStackFlightStatusProvider } from "@/providers/flight-status/aviationstack-flight-status-provider";
import { getFlightStatusEnv } from "@/config/flight-status";

/**
 * Commercial flight-status facade.
 * When AviationStack credentials are missing, remains NOT_CONFIGURED (returns null).
 * Never fabricates live status, gates, or delays.
 */
export class CommercialFlightStatusProvider implements FlightStatusProvider {
  readonly code = "AVIATIONSTACK";
  readonly name = "Commercial Flight Status (AviationStack)";
  readonly isMock = false;

  private readonly aviationStack = new AviationStackFlightStatusProvider();

  async lookup(input: FlightStatusLookupInput): Promise<FlightStatusSnapshot | null> {
    const env = getFlightStatusEnv();
    if (!env.useLive) return null;
    return this.aviationStack.lookup(input);
  }

  async healthCheck(): Promise<boolean> {
    return getFlightStatusEnv().useLive;
  }
}

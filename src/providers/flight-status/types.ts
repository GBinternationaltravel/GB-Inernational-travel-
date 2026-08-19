import type {
  FlightStatusLookupInput,
  FlightStatusSnapshot,
} from "@/types/flight-status";

/**
 * Flight status provider abstraction.
 * Connect airline / aggregator status APIs later without changing UI callers.
 */
export interface FlightStatusProvider {
  readonly code: string;
  readonly name: string;
  readonly isMock: boolean;

  lookup(input: FlightStatusLookupInput): Promise<FlightStatusSnapshot | null>;
  healthCheck?(): Promise<boolean>;
}

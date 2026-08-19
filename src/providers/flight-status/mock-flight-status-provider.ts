import type {
  FlightStatusCode,
  FlightStatusLookupInput,
  FlightStatusSnapshot,
} from "@/types/flight-status";
import type { FlightStatusProvider } from "@/providers/flight-status/types";

const MOCK_STATUSES: Array<{
  status: FlightStatusCode;
  statusLabel: string;
}> = [
  { status: "SCHEDULED", statusLabel: "Scheduled" },
  { status: "BOARDING", statusLabel: "Boarding" },
  { status: "DELAYED", statusLabel: "Delayed" },
  { status: "DEPARTED", statusLabel: "Departed" },
  { status: "ARRIVED", statusLabel: "Arrived" },
  { status: "CANCELLED", statusLabel: "Cancelled" },
];

function pickMockStatus(flightNumber: string) {
  let hash = 0;
  for (let i = 0; i < flightNumber.length; i += 1) {
    hash = (hash + flightNumber.charCodeAt(i) * (i + 1)) % MOCK_STATUSES.length;
  }
  return MOCK_STATUSES[hash] ?? MOCK_STATUSES[0]!;
}

/**
 * Mock flight-status provider for UI development.
 * Returns sample Scheduled/Boarding/Delayed/Departed/Arrived/Cancelled labels
 * with explicit MOCK labeling — never presented as live airline truth.
 */
export class MockFlightStatusProvider implements FlightStatusProvider {
  readonly code = "MOCK_FLIGHT_STATUS";
  readonly name = "Mock Flight Status Provider";
  readonly isMock = true;

  async lookup(input: FlightStatusLookupInput): Promise<FlightStatusSnapshot | null> {
    const flightNumber = input.flightNumber.trim().toUpperCase();
    if (!flightNumber) return null;

    const sample = pickMockStatus(flightNumber);

    return {
      flightNumber,
      airlineCode: flightNumber.slice(0, 2),
      origin: input.origin?.toUpperCase() ?? "—",
      destination: input.destination?.toUpperCase() ?? "—",
      departureAt: input.date,
      status: sample.status,
      statusLabel: sample.statusLabel,
      providerCode: this.code,
      isMock: true,
      dataLabel: "MOCK — sample status (not live)",
      notice:
        "This is a MOCK sample status for UI development only. Live gates, delays, and boarding times are never invented as operational truth.",
      checkedAt: new Date().toISOString(),
      delayMinutes: sample.status === "DELAYED" ? 35 : undefined,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

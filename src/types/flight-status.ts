export type FlightStatusCode =
  | "SCHEDULED"
  | "ON_TIME"
  | "DELAYED"
  | "BOARDING"
  | "DEPARTED"
  | "LANDED"
  | "ARRIVED"
  | "CANCELLED"
  | "UNKNOWN"
  | "NOT_AVAILABLE";

export interface FlightStatusSnapshot {
  airlineCode?: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureAt?: string;
  arrivalAt?: string;
  status: FlightStatusCode;
  statusLabel: string;
  gate?: string;
  terminal?: string;
  delayMinutes?: number;
  providerCode: string;
  isMock: boolean;
  dataLabel: string;
  notice: string;
  checkedAt: string;
}

export interface FlightStatusLookupInput {
  flightNumber: string;
  date?: string;
  origin?: string;
  destination?: string;
}

export interface BookingFlightStatusContext {
  bookingReference: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
}

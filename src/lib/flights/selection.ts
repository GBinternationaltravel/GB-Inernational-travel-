import type { FlightOffer, FlightSearchParams } from "@/types/flight";

const STORAGE_KEY = "gb_selected_flight_v1";

export type SelectedFlightState = {
  offer: FlightOffer;
  returnOffer?: FlightOffer;
  search: Pick<
    FlightSearchParams,
    | "tripType"
    | "origin"
    | "destination"
    | "departureDate"
    | "returnDate"
    | "adults"
    | "children"
    | "infants"
    | "cabinClass"
  >;
  selectedAt: string;
};

const PENDING_OUTBOUND_KEY = "gb_pending_outbound_v1";

export function savePendingOutbound(state: SelectedFlightState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_OUTBOUND_KEY, JSON.stringify(state));
}

export function readPendingOutbound(): SelectedFlightState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PENDING_OUTBOUND_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SelectedFlightState;
  } catch {
    return null;
  }
}

export function clearPendingOutbound(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_OUTBOUND_KEY);
}

export function saveSelectedFlight(state: SelectedFlightState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function readSelectedFlight(): SelectedFlightState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SelectedFlightState;
  } catch {
    return null;
  }
}

export function clearSelectedFlight(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

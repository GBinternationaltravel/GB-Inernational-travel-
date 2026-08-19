import type { FlightOffer, FlightSearchParams } from "@/types/flight";

const STORAGE_KEY = "gb_selected_flight_v1";

export type SelectedFlightState = {
  offer: FlightOffer;
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

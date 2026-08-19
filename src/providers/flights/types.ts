import type {
  BookingResult,
  CreateBookingInput,
  FlightOffer,
  FlightSearchParams,
  FlightSearchResult,
} from "@/types/flight";

/**
 * FlightProvider abstraction.
 * Frontend and services depend on this interface — never a specific airline/GDS SDK.
 */
export interface FlightProvider {
  readonly code: string;
  readonly name: string;

  searchFlights(params: FlightSearchParams): Promise<FlightSearchResult>;
  getOfferById?(id: string): Promise<FlightOffer | null>;
  createBooking?(input: CreateBookingInput): Promise<BookingResult>;
  healthCheck?(): Promise<boolean>;
}

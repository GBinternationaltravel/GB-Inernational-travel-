export type CabinClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

export type TripType = "ONE_WAY" | "ROUND_TRIP" | "MULTI_CITY";

export type CurrencyCode = "PKR" | "USD" | "EUR" | "GBP" | "AED";

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export interface AirportSummary {
  iataCode: string;
  name: string;
  city: string;
  country: string;
}

export interface AirlineSummary {
  iataCode: string;
  name: string;
}

export interface FlightSegmentOffer {
  origin: AirportSummary;
  destination: AirportSummary;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  flightNumber: string;
  airline: AirlineSummary;
  aircraftCode?: string;
}

export interface FlightOffer {
  /** Internal application offer ID (never assume this equals supplierOfferId). */
  id: string;
  providerCode: string;
  /** Supplier adapter code (e.g. MOCK). */
  supplierCode: string;
  /** Supplier's own offer / fare ID. */
  supplierOfferId: string;
  /** Optional supplier session / search context. */
  supplierSessionRef?: string | null;
  /** When the supplier offer is expected to expire. */
  expiresAt?: string | null;
  /** Development mock inventory is always labeled. */
  isMock: boolean;
  airlineId: string;
  tripType: TripType;
  cabinClass: CabinClass;
  /** Supplier currency preserved as returned — no invented FX conversion. */
  currency: CurrencyCode | string;
  totalPrice: number;
  segments: FlightSegmentOffer[];
  stops: number;
  durationMinutes: number;
  baggageKg: number;
  baggageIncluded: boolean;
  seatsRemaining?: number;
  refundable: boolean;
  /** Optional normalized commercial fields (nullable per supplier). */
  marketingCarrier?: AirlineSummary | null;
  operatingCarrier?: AirlineSummary | null;
  fareFamily?: string | null;
  baseFare?: number | null;
  taxes?: number | null;
  fees?: number | null;
  changeable?: boolean | null;
  fareRules?: string | null;
}

export interface FlightSearchParams {
  tripType: TripType;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  cabinClass: CabinClass;
  currency?: CurrencyCode;
}

export interface FlightSearchResult {
  offers: FlightOffer[];
  searchedAt: string;
  providerCode: string;
  supplierCode: string;
  isMock: boolean;
}

export interface PassengerInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
}

export interface CreateBookingInput {
  offerId: string;
  contactEmail: string;
  contactPhone?: string;
  passengers: PassengerInput[];
}

export interface BookingResult {
  bookingReference: string;
  status: "DRAFT" | "PENDING_PAYMENT" | "CONFIRMED" | "FAILED";
  providerCode: string;
  totalAmount: number;
  currency: CurrencyCode;
}

export type FlightSortOption =
  | "recommended"
  | "cheapest"
  | "fastest"
  | "earliest_departure"
  | "latest_arrival";

export type TimeOfDayBucket =
  | "early_morning"
  | "morning"
  | "afternoon"
  | "evening"
  | "night";

export type DurationBucket = "short" | "medium" | "long";

export type StopsFilter = "nonstop" | "one_stop" | "two_plus";

export interface FlightFiltersState {
  minPrice: number | null;
  maxPrice: number | null;
  stops: StopsFilter[];
  departureBuckets: TimeOfDayBucket[];
  arrivalBuckets: TimeOfDayBucket[];
  durationBuckets: DurationBucket[];
  baggageIncludedOnly: boolean;
  airlines: string[];
  refundableOnly: boolean;
}

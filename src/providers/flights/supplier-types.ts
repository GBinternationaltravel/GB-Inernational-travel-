import type {
  CabinClass,
  CurrencyCode,
  FlightOffer,
  FlightSearchParams,
  TripType,
} from "@/types/flight";

/** Supplier-neutral search request (UI maps into this). */
export type SupplierSearchRequest = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  tripType: TripType;
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
  currency: CurrencyCode;
  /** Optional multi-city legs for future use */
  legs?: Array<{
    origin: string;
    destination: string;
    departureDate: string;
  }>;
};

export type SupplierHealthStatus = {
  supplierCode: string;
  configured: boolean;
  available: boolean;
  isMock: boolean;
  lastSuccessfulRequestAt: string | null;
  lastError: string | null;
  message: string;
};

export type RevalidateOfferInput = {
  internalOfferId: string;
  supplierOfferId: string;
  supplierCode: string;
  supplierSessionRef?: string | null;
  expectedTotal?: number;
  currency?: string;
};

export type RevalidateOfferResult = {
  ok: boolean;
  status: "VALID" | "PRICE_CHANGED" | "EXPIRED" | "NO_AVAILABILITY" | "FAILED";
  offer: FlightOffer | null;
  previousTotal?: number;
  currentTotal?: number;
  currency?: string;
  message: string;
  isMock: boolean;
};

export type SupplierCreateBookingInput = {
  idempotencyKey: string;
  internalOfferId: string;
  supplierOfferId: string;
  supplierCode: string;
  supplierSessionRef?: string | null;
  contactEmail: string;
  contactPhone?: string;
  expectedTotal?: number;
  currency?: string;
  passengers: Array<{
    type: "ADULT" | "CHILD" | "INFANT";
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
    nationality?: string;
    /** Never log raw passport values */
    hasTravelDocument: boolean;
    /** Server-only; never logged or returned to browser */
    travelDocument?: {
      number: string;
      issuingCountry: string;
      expiry: string;
    } | null;
  }>;
};

export type SupplierCreateBookingResult =
  | {
      ok: true;
      isMock: boolean;
      supplierBookingId: string;
      supplierBookingRef: string;
      supplierBookingStatus: string;
      ticketingStatus: string;
      workbenchId?: string | null;
      message: string;
    }
  | {
      ok: false;
      code:
        | "NOT_CONFIGURED"
        | "NOT_SUPPORTED"
        | "BOOKING_FAILED"
        | "OFFER_EXPIRED"
        | "NO_AVAILABILITY"
        | "PRICE_CHANGED"
        | "IDEMPOTENCY_CONFLICT";
      message: string;
      isMock: boolean;
      previousTotal?: number;
      currentTotal?: number;
      workbenchId?: string | null;
    };

export type SupplierTicketIssueInput = {
  idempotencyKey: string;
  bookingReference: string;
  bookingId: string;
  supplierBookingId?: string | null;
};

export type SupplierTicketIssueResult =
  | {
      ok: true;
      confirmed: true;
      supplierPnr: string;
      ticketNumbers: string[];
      message: string;
    }
  | {
      ok: false;
      code: "NOT_CONFIGURED" | "NOT_SUPPORTED" | "TICKETING_FAILED";
      confirmed: false;
      message: string;
    };

export type SupplierBookingLookupResult =
  | {
      ok: true;
      supplierBookingId: string;
      supplierBookingRef: string;
      status: string;
      ticketingStatus: string;
    }
  | {
      ok: false;
      code: "NOT_CONFIGURED" | "NOT_SUPPORTED" | "INVALID_REQUEST";
      message: string;
    };

/**
 * Supplier-neutral flight integration surface.
 * UI and app services depend on this — never a specific GDS/NDC SDK.
 */
export interface FlightSupplier {
  readonly code: string;
  readonly name: string;
  readonly isMock: boolean;

  searchFlights(request: SupplierSearchRequest): Promise<{
    offers: FlightOffer[];
    searchedAt: string;
    supplierCode: string;
    isMock: boolean;
  }>;

  getOffer(input: {
    internalOfferId: string;
    supplierOfferId?: string;
  }): Promise<FlightOffer | null>;

  revalidateOffer(input: RevalidateOfferInput): Promise<RevalidateOfferResult>;

  createBooking(input: SupplierCreateBookingInput): Promise<SupplierCreateBookingResult>;

  issueTicket(input: SupplierTicketIssueInput): Promise<SupplierTicketIssueResult>;

  cancelBooking(input: {
    idempotencyKey: string;
    supplierBookingId: string;
  }): Promise<
    | { ok: true; message: string }
    | { ok: false; code: "NOT_CONFIGURED" | "NOT_SUPPORTED" | "CANCELLATION_FAILED"; message: string }
  >;

  getBooking(input: {
    supplierBookingId: string;
  }): Promise<SupplierBookingLookupResult>;

  getBookingStatus(input: {
    supplierBookingId: string;
  }): Promise<SupplierBookingLookupResult>;

  getHealthStatus(): Promise<SupplierHealthStatus>;
}

/** Map existing UI search params into supplier request. */
export function toSupplierSearchRequest(
  params: FlightSearchParams,
): SupplierSearchRequest {
  return {
    origin: params.origin,
    destination: params.destination,
    departureDate: params.departureDate,
    returnDate: params.returnDate,
    tripType: params.tripType,
    adults: params.adults,
    children: params.children ?? 0,
    infants: params.infants ?? 0,
    cabinClass: params.cabinClass,
    currency: params.currency ?? "PKR",
  };
}

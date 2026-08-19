import type { FlightOffer, FlightSearchParams, FlightSearchResult } from "@/types/flight";
import type { FlightProvider } from "@/providers/flights/types";
import type {
  FlightSupplier,
  RevalidateOfferInput,
  RevalidateOfferResult,
  SupplierCreateBookingInput,
  SupplierCreateBookingResult,
  SupplierHealthStatus,
  SupplierSearchRequest,
  SupplierTicketIssueInput,
  SupplierTicketIssueResult,
} from "@/providers/flights/supplier-types";
import { SupplierError } from "@/providers/flights/supplier-errors";
import { withSupplierLogging, getSupplierLogState } from "@/providers/flights/supplier-logging";
import { withIdempotency } from "@/providers/flights/idempotency";
import { getFlightSupplierEnv } from "@/config/flight-supplier";
import { generateMockOffers, getMockOfferById } from "@/data/mock/flights";
import { getAirportByCode } from "@/data/airports";

/**
 * Development-only flight supplier.
 * Clearly labeled mock behavior — never a real airline transaction.
 */
export class MockFlightSupplier implements FlightSupplier {
  readonly code = "MOCK";
  readonly name = "Mock Flight Supplier (development)";
  readonly isMock = true;

  async searchFlights(request: SupplierSearchRequest) {
    return withSupplierLogging(this.code, "searchFlights", async () => {
      const env = getFlightSupplierEnv();
      if (env.mockSimulate.timeout) {
        throw new SupplierError("SUPPLIER_TIMEOUT", "Mock supplier timeout simulation.", true);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      if (env.mockSimulate.noAvailability) {
        return {
          offers: [],
          searchedAt: new Date().toISOString(),
          supplierCode: this.code,
          isMock: true,
        };
      }

      const origin = getAirportByCode(request.origin);
      const destination = getAirportByCode(request.destination);
      if (!origin || !destination) {
        return {
          offers: [],
          searchedAt: new Date().toISOString(),
          supplierCode: this.code,
          isMock: true,
        };
      }

      const params: FlightSearchParams = {
        tripType: request.tripType,
        origin: request.origin,
        destination: request.destination,
        departureDate: request.departureDate,
        returnDate: request.returnDate,
        adults: request.adults,
        children: request.children,
        infants: request.infants,
        cabinClass: request.cabinClass,
        currency: request.currency,
      };

      const offers = generateMockOffers(params).map((offer) =>
        normalizeMockOffer(offer, request),
      );

      return {
        offers,
        searchedAt: new Date().toISOString(),
        supplierCode: this.code,
        isMock: true,
      };
    });
  }

  async getOffer(input: {
    internalOfferId: string;
    supplierOfferId?: string;
  }): Promise<FlightOffer | null> {
    return withSupplierLogging(this.code, "getOffer", async () => {
      const offer = getMockOfferById(input.internalOfferId);
      if (!offer) return null;
      return normalizeMockOffer(offer);
    });
  }

  async revalidateOffer(input: RevalidateOfferInput): Promise<RevalidateOfferResult> {
    return withSupplierLogging(
      this.code,
      "revalidateOffer",
      async () => {
        const env = getFlightSupplierEnv();
        const offer = getMockOfferById(input.internalOfferId);

        if (!offer) {
          return {
            ok: false,
            status: "NO_AVAILABILITY",
            offer: null,
            message: "Mock offer is no longer available.",
            isMock: true,
          };
        }

        const normalized = normalizeMockOffer(offer);

        if (env.mockSimulate.forceExpire || isExpired(normalized.expiresAt)) {
          return {
            ok: false,
            status: "EXPIRED",
            offer: null,
            previousTotal: input.expectedTotal,
            message:
              "Mock offer expired. This is simulated development behavior — not a real airline message.",
            isMock: true,
          };
        }

        if (env.mockSimulate.noAvailability) {
          return {
            ok: false,
            status: "NO_AVAILABILITY",
            offer: null,
            message: "Mock supplier reports no availability.",
            isMock: true,
          };
        }

        if (env.mockSimulate.priceChange) {
          const changed: FlightOffer = {
            ...normalized,
            totalPrice: Math.round(normalized.totalPrice * 1.05),
            baseFare: Math.round((normalized.baseFare ?? normalized.totalPrice) * 1.05),
          };
          return {
            ok: false,
            status: "PRICE_CHANGED",
            offer: changed,
            previousTotal: input.expectedTotal ?? normalized.totalPrice,
            currentTotal: changed.totalPrice,
            currency: changed.currency,
            message:
              "Mock fare changed during revalidation. Review the updated price before continuing.",
            isMock: true,
          };
        }

        return {
          ok: true,
          status: "VALID",
          offer: normalized,
          previousTotal: input.expectedTotal ?? normalized.totalPrice,
          currentTotal: normalized.totalPrice,
          currency: normalized.currency,
          message: "Mock offer revalidated successfully (development only).",
          isMock: true,
        };
      },
      {
        internalOfferId: input.internalOfferId,
        supplierOfferId: input.supplierOfferId,
      },
    );
  }

  async createBooking(
    input: SupplierCreateBookingInput,
  ): Promise<SupplierCreateBookingResult> {
    return withSupplierLogging(
      this.code,
      "createBooking",
      async () => {
        const { result } = await withIdempotency(
          input.idempotencyKey,
          "createBooking",
          async (): Promise<SupplierCreateBookingResult> => {
            // Mock supplier does not create real airline bookings / PNRs.
            return {
              ok: false,
              code: "NOT_CONFIGURED",
              isMock: true,
              message:
                "Supplier booking is not configured. Mock mode does not create airline PNRs or e-tickets.",
            };
          },
        );
        return result;
      },
      { idempotencyKey: input.idempotencyKey, offerId: input.internalOfferId },
    );
  }

  async issueTicket(input: SupplierTicketIssueInput): Promise<SupplierTicketIssueResult> {
    return withSupplierLogging(
      this.code,
      "issueTicket",
      async () => {
        const { result } = await withIdempotency(
          input.idempotencyKey,
          "issueTicket",
          async (): Promise<SupplierTicketIssueResult> => ({
            ok: false,
            code: "NOT_CONFIGURED",
            confirmed: false,
            message:
              "Ticketing is not configured. Payment success does not issue airline tickets.",
          }),
        );
        return result;
      },
      { idempotencyKey: input.idempotencyKey, bookingReference: input.bookingReference },
    );
  }

  async cancelBooking() {
    return {
      ok: false as const,
      code: "NOT_SUPPORTED" as const,
      message: "Supplier cancellation is not supported in mock mode.",
    };
  }

  async getBooking() {
    return {
      ok: false as const,
      code: "NOT_CONFIGURED" as const,
      message: "Supplier booking lookup is not configured.",
    };
  }

  async getBookingStatus() {
    return this.getBooking();
  }

  async getHealthStatus(): Promise<SupplierHealthStatus> {
    const logs = getSupplierLogState();
    return {
      supplierCode: this.code,
      configured: true,
      available: true,
      isMock: true,
      lastSuccessfulRequestAt: logs.lastSuccessfulRequestAt,
      lastError: logs.lastError,
      message: "Mock flight supplier is healthy (development only).",
    };
  }
}

function normalizeMockOffer(
  offer: FlightOffer,
  request?: SupplierSearchRequest,
): FlightOffer {
  const airline = offer.segments[0]?.airline;
  return {
    ...offer,
    providerCode: "MOCK",
    supplierCode: offer.supplierCode ?? "MOCK",
    supplierOfferId: offer.supplierOfferId ?? `sup-${offer.id}`,
    supplierSessionRef: offer.supplierSessionRef ?? null,
    expiresAt: offer.expiresAt ?? new Date(Date.now() + 30 * 60_000).toISOString(),
    isMock: true,
    tripType: request?.tripType ?? offer.tripType,
    currency: request?.currency ?? offer.currency,
    marketingCarrier: offer.marketingCarrier ?? airline ?? null,
    operatingCarrier: offer.operatingCarrier ?? airline ?? null,
    fareFamily: offer.fareFamily ?? null,
    baseFare: offer.baseFare ?? Math.round(offer.totalPrice * 0.88),
    taxes: offer.taxes ?? Math.round(offer.totalPrice * 0.12),
    fees: offer.fees ?? 0,
    changeable: offer.changeable ?? null,
    fareRules: offer.fareRules ?? "Mock fare rules — development only.",
  };
}

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/**
 * Backward-compatible FlightProvider adapter over MockFlightSupplier.
 */
export class MockFlightProvider implements FlightProvider {
  readonly code = "MOCK";
  readonly name = "Mock Flight Provider";
  private readonly supplier = new MockFlightSupplier();

  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResult> {
    const result = await this.supplier.searchFlights({
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
    });
    return {
      offers: result.offers,
      searchedAt: result.searchedAt,
      providerCode: result.supplierCode,
      supplierCode: result.supplierCode,
      isMock: result.isMock,
    };
  }

  async getOfferById(id: string) {
    return this.supplier.getOffer({ internalOfferId: id });
  }

  async createBooking() {
    return {
      bookingReference: `MOCK-DEV-${Date.now().toString(36).toUpperCase()}`,
      status: "DRAFT" as const,
      providerCode: this.code,
      totalAmount: 0,
      currency: "PKR" as const,
    };
  }

  async healthCheck() {
    const health = await this.supplier.getHealthStatus();
    return health.available;
  }
}

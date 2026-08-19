/**
 * Travelport TripServices Flights adapter — sandbox/development only.
 * Implements FlightSupplier; UI never imports this module directly.
 *
 * Auth: OAuth password grant (Travelport developer docs)
 * Search: POST catalog/search/catalogproductofferings
 * Price: POST price/offers/buildfromcatalogproductofferings
 *
 * Booking/ticketing stay NOT_CONFIGURED until sandbox booking is explicitly enabled
 * with documented credentials — never fabricate PNRs or ticket numbers.
 */

import {
  buildAddOfferBody,
  buildCommitBody,
  buildTravelersListBody,
  buildWorkbenchCreateBody,
  extractLocator,
  extractWorkbenchId,
  parseTravelportSession,
} from "@/providers/flights/travelport-booking";
import { getFlightSupplierEnv } from "@/config/flight-supplier";
import { travelportRequest } from "@/providers/flights/travelport-client";
import { getTravelportAccessToken, clearTravelportTokenCache } from "@/providers/flights/travelport-auth";
import { buildTravelportSearchRequest, buildTravelportAirPriceRequest } from "@/providers/flights/travelport-request-builders";
import {
  normalizeTravelportSearchResponse,
  normalizeTravelportPriceResponse,
} from "@/providers/flights/travelport-normalize";
import { SupplierError } from "@/providers/flights/supplier-errors";
import { withSupplierLogging, getSupplierLogState } from "@/providers/flights/supplier-logging";
import { withIdempotency } from "@/providers/flights/idempotency";
import type { FlightOffer } from "@/types/flight";
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

const offerCache = new Map<string, FlightOffer>();
const CACHE_TTL_MS = 45 * 60_000;
const offerCacheExpiry = new Map<string, number>();

export type TravelportFlightSupplierOptions = {
  fetchImpl?: typeof fetch;
};

export class TravelportFlightSupplier implements FlightSupplier {
  readonly code = "TRAVELPORT";
  readonly name = "Travelport TripServices (sandbox)";
  readonly isMock = false;
  private readonly fetchImpl?: typeof fetch;

  constructor(options: TravelportFlightSupplierOptions = {}) {
    this.fetchImpl = options.fetchImpl;
  }

  async searchFlights(request: SupplierSearchRequest) {
    return withSupplierLogging(
      this.code,
      "searchFlights",
      async () => {
        assertConfigured();
        const body = buildTravelportSearchRequest(request);
        const payload = await travelportRequest<unknown>(
          "catalog/search/catalogproductofferings",
          { method: "POST", body, fetchImpl: this.fetchImpl },
        );

        const { offers } = normalizeTravelportSearchResponse(payload, {
          tripType: request.tripType,
          cabinClass: request.cabinClass,
          currency: request.currency,
        });

        if (!offers.length) {
          throw new SupplierError(
            "NO_AVAILABILITY",
            "Travelport returned no flight offerings for this search.",
          );
        }

        for (const offer of offers) {
          cacheOffer(offer);
        }

        return {
          offers,
          searchedAt: new Date().toISOString(),
          supplierCode: this.code,
          isMock: false,
        };
      },
      {
        origin: request.origin,
        destination: request.destination,
        tripType: request.tripType,
      },
    );
  }

  async getOffer(input: {
    internalOfferId: string;
    supplierOfferId?: string;
  }): Promise<FlightOffer | null> {
    return withSupplierLogging(this.code, "getOffer", async () => {
      const cached = readCachedOffer(input.internalOfferId);
      if (cached) return cached;
      if (input.supplierOfferId) {
        for (const offer of offerCache.values()) {
          if (offer.supplierOfferId === input.supplierOfferId) return offer;
        }
      }
      return null;
    });
  }

  async revalidateOffer(input: RevalidateOfferInput): Promise<RevalidateOfferResult> {
    return withSupplierLogging(
      this.code,
      "revalidateOffer",
      async () => {
        assertConfigured();

        const previous =
          readCachedOffer(input.internalOfferId) ??
          ({
            id: input.internalOfferId,
            providerCode: this.code,
            supplierCode: this.code,
            supplierOfferId: input.supplierOfferId,
            supplierSessionRef: input.supplierSessionRef ?? null,
            expiresAt: null,
            isMock: false,
            airlineId: "xx",
            tripType: "ONE_WAY",
            cabinClass: "ECONOMY",
            currency: (input.currency as FlightOffer["currency"]) || "PKR",
            totalPrice: input.expectedTotal ?? 0,
            segments: [],
            stops: 0,
            durationMinutes: 0,
            baggageKg: 0,
            baggageIncluded: false,
            refundable: false,
          } satisfies FlightOffer);

        if (previous.expiresAt && new Date(previous.expiresAt).getTime() < Date.now()) {
          return {
            ok: false,
            status: "EXPIRED",
            offer: null,
            previousTotal: input.expectedTotal ?? previous.totalPrice,
            message: "Your selected flight is no longer available.",
            isMock: false,
          };
        }

        const session = parseTravelportSession(
          input.supplierSessionRef ?? previous.supplierSessionRef,
        );
        if (
          !session.catalogOfferingsId ||
          !session.catalogProductOfferingId ||
          !session.productIds?.length
        ) {
          throw new SupplierError(
            "INVALID_REQUEST",
            "Travelport offer session is missing required pricing identifiers.",
          );
        }

        try {
          const payload = await travelportRequest<unknown>(
            "price/offers/buildfromcatalogproductofferings",
            {
              method: "POST",
              body: buildTravelportAirPriceRequest({
                catalogOfferingsId: session.catalogOfferingsId,
                catalogProductOfferingId: session.catalogProductOfferingId,
                productIds: session.productIds,
              }),
              fetchImpl: this.fetchImpl,
            },
          );

          const priced = normalizeTravelportPriceResponse(payload, previous);
          cacheOffer(priced.offer);

          const expected = input.expectedTotal ?? previous.totalPrice;
          const current = priced.total;
          const changed =
            Number.isFinite(expected) &&
            Number.isFinite(current) &&
            Math.abs(expected - current) >= 1;

          if (changed) {
            return {
              ok: false,
              status: "PRICE_CHANGED",
              offer: priced.offer,
              previousTotal: expected,
              currentTotal: current,
              currency: priced.currency,
              message: "Your selected flight price has changed.",
              isMock: false,
            };
          }

          return {
            ok: true,
            status: "VALID",
            offer: priced.offer,
            previousTotal: expected,
            currentTotal: current,
            currency: priced.currency,
            message: "Offer revalidated successfully.",
            isMock: false,
          };
        } catch (error) {
          if (error instanceof SupplierError) {
            if (error.code === "OFFER_EXPIRED") {
              return {
                ok: false,
                status: "EXPIRED",
                offer: null,
                previousTotal: input.expectedTotal ?? previous.totalPrice,
                message: "Your selected flight is no longer available.",
                isMock: false,
              };
            }
            if (error.code === "NO_AVAILABILITY") {
              return {
                ok: false,
                status: "NO_AVAILABILITY",
                offer: null,
                previousTotal: input.expectedTotal ?? previous.totalPrice,
                message: "Your selected flight is no longer available.",
                isMock: false,
              };
            }
          }
          throw error;
        }
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
            const { travelport } = getFlightSupplierEnv();
            if (!travelport.hasCredentials) {
              return {
                ok: false,
                code: "NOT_CONFIGURED",
                isMock: false,
                message: "Travelport sandbox credentials are not configured.",
              };
            }
            if (!travelport.enableSandboxBooking) {
              return {
                ok: false,
                code: "NOT_CONFIGURED",
                isMock: false,
                message:
                  "Travelport sandbox booking is disabled. Set TRAVELPORT_ENABLE_SANDBOX_BOOKING=true only for approved pre-production booking tests.",
              };
            }
            if (!travelport.isSandbox) {
              return {
                ok: false,
                code: "NOT_SUPPORTED",
                isMock: false,
                message:
                  "Production Travelport booking is not enabled in Phase 7D.",
              };
            }

            const session = parseTravelportSession(input.supplierSessionRef);
            if (
              !session.catalogOfferingsId &&
              !session.priceTransactionId
            ) {
              return {
                ok: false,
                code: "BOOKING_FAILED",
                isMock: false,
                message:
                  "Missing Travelport offer session identifiers. Revalidate the offer and try again.",
              };
            }
            if (!session.catalogProductOfferingId || !session.productIds?.length) {
              return {
                ok: false,
                code: "BOOKING_FAILED",
                isMock: false,
                message:
                  "Missing Travelport product identifiers for booking.",
              };
            }

            let workbenchId = session.workbenchId ?? null;

            try {
              if (!workbenchId) {
                const workbenchPayload = await travelportRequest<unknown>(
                  "book/session/reservationworkbench",
                  {
                    method: "POST",
                    body: buildWorkbenchCreateBody(),
                    fetchImpl: this.fetchImpl,
                  },
                );
                workbenchId = extractWorkbenchId(workbenchPayload);
                if (!workbenchId) {
                  return {
                    ok: false,
                    code: "BOOKING_FAILED",
                    isMock: false,
                    message: "Travelport did not return a workbench identifier.",
                  };
                }
              }

              await travelportRequest(
                `book/traveler/reservationworkbench/${encodeURIComponent(workbenchId)}/travelers/list`,
                {
                  method: "POST",
                  body: buildTravelersListBody(input),
                  fetchImpl: this.fetchImpl,
                },
              );

              await travelportRequest(
                `book/airoffer/reservationworkbench/${encodeURIComponent(workbenchId)}/offers/buildfromcatalogproductofferings`,
                {
                  method: "POST",
                  body: buildAddOfferBody(session),
                  fetchImpl: this.fetchImpl,
                },
              );

              let commitPayload: unknown;
              try {
                commitPayload = await travelportRequest<unknown>(
                  `book/reservation/reservations/${encodeURIComponent(workbenchId)}`,
                  {
                    method: "POST",
                    body: buildCommitBody(),
                    fetchImpl: this.fetchImpl,
                    timeoutMs: 60_000,
                  },
                );
              } catch (error) {
                if (
                  error instanceof SupplierError &&
                  error.code === "SUPPLIER_TIMEOUT"
                ) {
                  // Safe resolution only — never create another booking.
                  if (workbenchId) {
                    try {
                      const resolved = await this.getBooking({
                        supplierBookingId: workbenchId,
                      });
                      if (resolved.ok && resolved.supplierBookingRef) {
                        return {
                          ok: true,
                          isMock: false,
                          supplierBookingId: workbenchId,
                          supplierBookingRef: resolved.supplierBookingRef,
                          supplierBookingStatus: resolved.status || "HELD",
                          ticketingStatus: resolved.ticketingStatus || "NOT_TICKETED",
                          workbenchId,
                          message:
                            "Travelport reservation resolved after timeout (held). Ticketing was not performed.",
                        };
                      }
                    } catch {
                      // Fall through to timeout failure.
                    }
                  }
                  return {
                    ok: false,
                    code: "BOOKING_FAILED",
                    isMock: false,
                    workbenchId,
                    message:
                      "Travelport booking timed out after the request may have been received. The booking was not retried. Please resolve status before trying again.",
                  };
                }
                throw error;
              }

              const extracted = extractLocator(commitPayload);
              if (extracted.priceChanged) {
                return {
                  ok: false,
                  code: "PRICE_CHANGED",
                  isMock: false,
                  workbenchId,
                  previousTotal: input.expectedTotal,
                  message:
                    "Your selected flight price has changed. Accept the new price before booking.",
                };
              }
              if (!extracted.locator) {
                return {
                  ok: false,
                  code: "BOOKING_FAILED",
                  isMock: false,
                  workbenchId,
                  message:
                    "Travelport did not return a reservation locator. No supplier booking reference was stored.",
                };
              }

              return {
                ok: true,
                isMock: false,
                supplierBookingId: workbenchId,
                supplierBookingRef: extracted.locator,
                supplierBookingStatus: extracted.status || "HELD",
                ticketingStatus: "NOT_TICKETED",
                workbenchId,
                message:
                  "Travelport pre-production reservation created (held). Ticketing was not performed.",
              };
            } catch (error) {
              if (error instanceof SupplierError) {
                if (error.code === "OFFER_EXPIRED") {
                  return {
                    ok: false,
                    code: "OFFER_EXPIRED",
                    isMock: false,
                    workbenchId,
                    message: "Your selected flight is no longer available.",
                  };
                }
                if (error.code === "NO_AVAILABILITY") {
                  return {
                    ok: false,
                    code: "NO_AVAILABILITY",
                    isMock: false,
                    workbenchId,
                    message: "Your selected flight is no longer available.",
                  };
                }
                if (error.code === "PRICE_CHANGED") {
                  return {
                    ok: false,
                    code: "PRICE_CHANGED",
                    isMock: false,
                    workbenchId,
                    previousTotal: input.expectedTotal,
                    message: "Your selected flight price has changed.",
                  };
                }
                return {
                  ok: false,
                  code: "BOOKING_FAILED",
                  isMock: false,
                  workbenchId,
                  message: "We couldn't create the supplier reservation right now.",
                };
              }
              return {
                ok: false,
                code: "BOOKING_FAILED",
                isMock: false,
                workbenchId,
                message: "We couldn't create the supplier reservation right now.",
              };
            }
          },
        );
        return result;
      },
      {
        idempotencyKey: input.idempotencyKey,
        offerId: input.internalOfferId,
        passengerCount: input.passengers.length,
        // Never include travel documents / passport numbers.
        hasDocuments: input.passengers.some((p) => p.hasTravelDocument),
      },
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
          async (): Promise<SupplierTicketIssueResult> => {
            const { travelport } = getFlightSupplierEnv();
            if (!travelport.enableSandboxTicketing) {
              return {
                ok: false,
                code: "NOT_CONFIGURED",
                confirmed: false,
                message:
                  "Travelport ticketing is disabled. Payment success does not issue airline tickets.",
              };
            }
            return {
              ok: false,
              code: "NOT_SUPPORTED",
              confirmed: false,
              message:
                "Travelport sandbox ticketing is not enabled for customer use in Phase 7D.",
            };
          },
        );
        return result;
      },
      {
        idempotencyKey: input.idempotencyKey,
        bookingReference: input.bookingReference,
      },
    );
  }

  async cancelBooking() {
    return {
      ok: false as const,
      code: "NOT_SUPPORTED" as const,
      message: "Travelport cancellation is not enabled in Phase 7D.",
    };
  }

  async getBooking(input: { supplierBookingId: string }) {
    if (!input.supplierBookingId) {
      return {
        ok: false as const,
        code: "INVALID_REQUEST" as const,
        message: "Supplier booking identifier is required.",
      };
    }
    try {
      const payload = await travelportRequest<unknown>(
        `book/reservation/reservations/${encodeURIComponent(input.supplierBookingId)}`,
        { method: "GET", fetchImpl: this.fetchImpl },
      );
      const extracted = extractLocator(payload);
      if (!extracted.locator) {
        return {
          ok: false as const,
          code: "NOT_CONFIGURED" as const,
          message: "Travelport reservation could not be resolved.",
        };
      }
      return {
        ok: true as const,
        supplierBookingId: input.supplierBookingId,
        supplierBookingRef: extracted.locator,
        status: extracted.status || "HELD",
        ticketingStatus: "NOT_TICKETED",
      };
    } catch {
      return {
        ok: false as const,
        code: "NOT_CONFIGURED" as const,
        message: "Travelport reservation lookup is unavailable.",
      };
    }
  }

  async getBookingStatus(input: { supplierBookingId: string }) {
    return this.getBooking(input);
  }

  async getHealthStatus(): Promise<SupplierHealthStatus> {
    const { travelport } = getFlightSupplierEnv();
    const logs = getSupplierLogState();

    if (!travelport.hasCredentials) {
      return {
        supplierCode: this.code,
        configured: false,
        available: false,
        isMock: false,
        lastSuccessfulRequestAt: logs.lastSuccessfulRequestAt,
        lastError: logs.lastError,
        message: "Travelport credentials are not configured.",
      };
    }

    try {
      // Lightweight auth connectivity check — no search/shopping traffic.
      await getTravelportAccessToken(this.fetchImpl);
      return {
        supplierCode: this.code,
        configured: true,
        available: true,
        isMock: false,
        lastSuccessfulRequestAt: logs.lastSuccessfulRequestAt ?? new Date().toISOString(),
        lastError: logs.lastError,
        message: `Travelport ${travelport.environment} authentication reachable.`,
      };
    } catch (error) {
      return {
        supplierCode: this.code,
        configured: true,
        available: false,
        isMock: false,
        lastSuccessfulRequestAt: logs.lastSuccessfulRequestAt,
        lastError: error instanceof Error ? error.message : "Travelport health check failed",
        message: "Travelport authentication check failed.",
      };
    }
  }
}

function assertConfigured() {
  const { travelport } = getFlightSupplierEnv();
  if (!travelport.hasCredentials) {
    throw new SupplierError(
      "NOT_CONFIGURED",
      "Travelport sandbox credentials are not configured.",
    );
  }
}

function cacheOffer(offer: FlightOffer) {
  offerCache.set(offer.id, offer);
  offerCacheExpiry.set(offer.id, Date.now() + CACHE_TTL_MS);
}

function readCachedOffer(id: string): FlightOffer | null {
  const expires = offerCacheExpiry.get(id);
  if (!expires || expires < Date.now()) {
    offerCache.delete(id);
    offerCacheExpiry.delete(id);
    return null;
  }
  return offerCache.get(id) ?? null;
}

/** Test helper */
export function clearTravelportOfferCache() {
  offerCache.clear();
  offerCacheExpiry.clear();
  clearTravelportTokenCache();
}

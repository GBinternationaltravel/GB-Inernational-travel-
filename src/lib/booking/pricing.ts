import { bookingPricingConfig } from "@/config/booking";
import type { FlightOffer } from "@/types/flight";

export type AgencyMarkupResult = {
  supplierFare: number;
  rate: number;
  markup: number;
  customerTotal: number;
  band: "STANDARD_5" | "HIGH_3_5";
};

/**
 * GB markup applied once on the supplier fare (server-side).
 * ≤ PKR 50,000 → 5%; above PKR 50,000 → 3.5%.
 * Never compound markup on an already-marked-up total.
 */
export function calculateAgencyMarkup(supplierFarePkr: number): AgencyMarkupResult {
  const supplierFare = Math.max(0, Math.round(supplierFarePkr));
  const rate =
    supplierFare > bookingPricingConfig.markupThresholdPkr
      ? bookingPricingConfig.markupRateHigh
      : bookingPricingConfig.markupRateStandard;
  const markup = Math.round(supplierFare * rate);
  return {
    supplierFare,
    rate,
    markup,
    customerTotal: supplierFare + markup,
    band: rate === bookingPricingConfig.markupRateHigh ? "HIGH_3_5" : "STANDARD_5",
  };
}

export type PriceSnapshot = {
  currency: string;
  /** Fare component before taxes (display). */
  baseFare: number;
  taxes: number;
  /** Agency markup amount (applied once). */
  fees: number;
  /** Supplier fare before agency markup. */
  supplierFare: number;
  /** Markup rate applied (0.05 or 0.035). */
  markupRate: number;
  /** Customer-facing total = supplierFare + fees. */
  total: number;
  isMock: boolean;
  notice: string;
};

export type OfferSnapshot = {
  isMock: boolean;
  offerId: string;
  /** Alias of offerId for clarity in supplier-neutral architecture */
  internalOfferId: string;
  supplierCode: string;
  supplierOfferId: string;
  supplierSessionRef?: string | null;
  expiresAt?: string | null;
  providerCode: string;
  airlineId: string;
  airlineName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  originCity: string;
  destinationCity: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  stops: number;
  cabinClass: string;
  baggageKg: number;
  baggageIncluded: boolean;
  refundable: boolean;
  pricing: PriceSnapshot;
};

/** Server-side only. Never trust browser-provided totals. */
export function calculateMockPriceSnapshot(offer: FlightOffer): PriceSnapshot {
  return calculateOfferPriceSnapshot(offer);
}

export function calculateOfferPriceSnapshot(offer: FlightOffer): PriceSnapshot {
  const supplierFare = Math.round(offer.totalPrice);
  const taxes =
    typeof offer.taxes === "number"
      ? Math.round(offer.taxes)
      : Math.round(supplierFare * bookingPricingConfig.taxRate);
  const baseFare =
    typeof offer.baseFare === "number"
      ? Math.round(offer.baseFare)
      : Math.max(0, supplierFare - taxes);

  const { markup, rate, customerTotal } = calculateAgencyMarkup(supplierFare);
  const ratePct = (rate * 100).toFixed(rate === 0.035 ? 1 : 0);

  return {
    currency: offer.currency || bookingPricingConfig.currency,
    baseFare,
    taxes,
    fees: markup,
    supplierFare,
    markupRate: rate,
    total: customerTotal,
    isMock: offer.isMock,
    notice: offer.isMock
      ? `Mock pricing with ${ratePct}% GB service fee on supplier fare. Not a live airline ticket.`
      : `Supplier fare plus ${ratePct}% GB service fee. Amount is revalidated before payment. Payment is not ticket confirmation.`,
  };
}

export function buildOfferSnapshot(offer: FlightOffer): OfferSnapshot {
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];
  if (!first || !last) {
    throw new Error("INVALID_OFFER");
  }

  return {
    isMock: offer.isMock,
    offerId: offer.id,
    internalOfferId: offer.id,
    supplierCode: offer.supplierCode || offer.providerCode,
    supplierOfferId: offer.supplierOfferId || offer.id,
    supplierSessionRef: offer.supplierSessionRef ?? null,
    expiresAt: offer.expiresAt ?? null,
    providerCode: offer.providerCode,
    airlineId: offer.airlineId,
    airlineName: first.airline.name,
    flightNumber: first.flightNumber,
    origin: first.origin.iataCode,
    destination: last.destination.iataCode,
    originCity: first.origin.city,
    destinationCity: last.destination.city,
    departureAt: first.departureAt,
    arrivalAt: last.arrivalAt,
    durationMinutes: offer.durationMinutes,
    stops: offer.stops,
    cabinClass: offer.cabinClass,
    baggageKg: offer.baggageKg,
    baggageIncluded: offer.baggageIncluded,
    refundable: offer.refundable,
    pricing: calculateOfferPriceSnapshot(offer),
  };
}

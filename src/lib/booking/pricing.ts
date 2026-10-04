import { bookingPricingConfig } from "@/config/booking";
import type { FlightOffer } from "@/types/flight";
import { formatFlightNumber } from "@/lib/flights/flight-number";

export type ServiceFeeBand = "UP_TO_30K" | "UP_TO_100K" | "ABOVE_100K";

export type AgencyMarkupOptions = {
  /** Paying seats (adults + children). Defaults to 1. Infants are not seats. */
  seats?: number;
  /** Part of the supplier fare that belongs to infants — no GB fee is charged on it. */
  infantFare?: number;
};

export type AgencyMarkupResult = {
  supplierFare: number;
  /** Effective fee as a share of the supplier fare (informational only). */
  rate: number;
  /** Total GB service fee = feePerSeat × seats. */
  markup: number;
  customerTotal: number;
  band: ServiceFeeBand;
  /** Seats the fee was charged on (adults + children). */
  seats: number;
  /** Fare + taxes for one seat (infant share excluded). */
  perSeatFare: number;
  /** Fixed PKR fee charged per seat. */
  feePerSeat: number;
};

const BANDS: readonly ServiceFeeBand[] = ["UP_TO_30K", "UP_TO_100K", "ABOVE_100K"];

/** Fixed PKR GB service fee for one seat with the given fare + taxes. */
export function serviceFeePerSeat(perSeatFarePkr: number): {
  feePerSeat: number;
  band: ServiceFeeBand;
} {
  const fare = Math.max(0, Math.round(perSeatFarePkr));
  const tiers = bookingPricingConfig.serviceFeeTiers;
  const index = tiers.findIndex((tier) => fare <= tier.maxPerSeatFarePkr);
  const tierIndex = index === -1 ? tiers.length - 1 : index;
  const tier = tiers[tierIndex]!;
  return { feePerSeat: tier.feePerSeatPkr, band: BANDS[tierIndex] ?? "ABOVE_100K" };
}

/**
 * GB service fee applied once on the supplier fare (server-side).
 * Fixed PKR amount per seat (adults + children), chosen from the per-seat fare:
 * ≤ PKR 30,000 → 1,000; ≤ PKR 100,000 → 1,500; above → 2,500. Infants pay no fee.
 * Always pass the SUPPLIER fare — never an already-marked-up customer total.
 */
export function calculateAgencyMarkup(
  supplierFarePkr: number,
  options: AgencyMarkupOptions = {},
): AgencyMarkupResult {
  const supplierFare = Math.max(0, Math.round(supplierFarePkr));
  const seats = Math.max(1, Math.floor(options.seats ?? 1));
  const infantFare = Math.min(supplierFare, Math.max(0, Math.round(options.infantFare ?? 0)));
  const perSeatFare = Math.round((supplierFare - infantFare) / seats);
  const tier = serviceFeePerSeat(perSeatFare);
  // No fare (e.g. supplier returned no price) → no fee.
  const feePerSeat = supplierFare > 0 ? tier.feePerSeat : 0;
  const band = tier.band;
  const markup = feePerSeat * seats;
  return {
    supplierFare,
    rate: supplierFare > 0 ? Math.round((markup / supplierFare) * 10_000) / 10_000 : 0,
    markup,
    customerTotal: supplierFare + markup,
    band,
    seats,
    perSeatFare,
    feePerSeat,
  };
}

/** Seat / infant split for an offer, taken from the passenger mix it was priced for. */
export function markupOptionsForOffer(
  offer: Pick<FlightOffer, "pricedPassengers" | "infantFareTotal">,
): AgencyMarkupOptions {
  const pax = offer.pricedPassengers;
  if (!pax) return { seats: 1, infantFare: 0 };
  const seats = Math.max(0, Math.floor(pax.adults)) + Math.max(0, Math.floor(pax.children));
  return {
    seats: Math.max(1, seats),
    infantFare: pax.infants > 0 ? Math.max(0, offer.infantFareTotal ?? 0) : 0,
  };
}

export type PriceSnapshot = {
  currency: string;
  /** Fare component before taxes (display). */
  baseFare: number;
  taxes: number;
  /** GB service fee amount (applied once). */
  fees: number;
  /** Supplier fare before the GB service fee. */
  supplierFare: number;
  /**
   * Effective fee as a share of supplier fare. Legacy snapshots (before the
   * per-seat model) hold 0.05 or 0.035 here.
   */
  markupRate: number;
  /** Fixed PKR fee per seat (per-seat model only; absent on legacy snapshots). */
  feePerSeat?: number;
  /** Seats the fee was charged on — adults + children (per-seat model only). */
  feeSeats?: number;
  /** Customer-facing total = supplierFare + fees. */
  total: number;
  isMock: boolean;
  notice: string;
};

function formatPkr(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

/**
 * Short description of how the GB service fee was worked out, e.g.
 * "PKR 1,500 per seat × 2" — or "5%" / "3.5%" for bookings priced before the change.
 */
export function describeServiceFee(
  pricing: Pick<PriceSnapshot, "markupRate" | "feePerSeat" | "feeSeats"> | null | undefined,
): string | null {
  if (!pricing) return null;
  if (typeof pricing.feePerSeat === "number") {
    const seats = pricing.feeSeats ?? 1;
    return `${formatPkr(pricing.feePerSeat)} per seat${seats > 1 ? ` × ${seats}` : ""}`;
  }
  if (pricing.markupRate === 0.05 || pricing.markupRate === 0.035) {
    return `${(pricing.markupRate * 100).toFixed(pricing.markupRate === 0.035 ? 1 : 0)}%`;
  }
  return null;
}

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

  const { markup, rate, customerTotal, feePerSeat, seats } = calculateAgencyMarkup(
    supplierFare,
    markupOptionsForOffer(offer),
  );
  const feeText = `${formatPkr(feePerSeat)} per seat${seats > 1 ? ` × ${seats} seats` : ""}`;
  const infantText = offer.pricedPassengers?.infants ? " (no fee for infants)" : "";

  return {
    currency: offer.currency || bookingPricingConfig.currency,
    baseFare,
    taxes,
    fees: markup,
    supplierFare,
    markupRate: rate,
    feePerSeat,
    feeSeats: seats,
    total: customerTotal,
    isMock: offer.isMock,
    notice: offer.isMock
      ? `Mock pricing with GB service fee of ${feeText}${infantText}. Not a live airline ticket.`
      : `Supplier fare plus GB service fee of ${feeText}${infantText}. Amount is revalidated before payment. Payment is not ticket confirmation.`,
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
    flightNumber: formatFlightNumber(first.flightNumber, first.airline.iataCode),
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

import { generateMockOffers } from "@/data/mock/flights";
import type { CabinClass, FlightOffer, FlightSearchParams, TripType } from "@/types/flight";

export type RoundTripFareLeg = {
  origin: string;
  destination: string;
  date: string;
  supplierFare: number;
  currency: string;
  offerId: string;
};

export type RoundTripFareSummary = {
  tripType: "ONE_WAY" | "ROUND_TRIP";
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  outbound: RoundTripFareLeg | null;
  inbound: RoundTripFareLeg | null;
  combinedSupplierFare: number;
  currency: string;
};

export function reverseRoute(origin: string, destination: string): {
  origin: string;
  destination: string;
} {
  return {
    origin: destination.toUpperCase(),
    destination: origin.toUpperCase(),
  };
}

export function cheapestOffer(offers: FlightOffer[]): FlightOffer | null {
  if (offers.length === 0) return null;
  return offers.reduce((best, offer) =>
    offer.totalPrice < best.totalPrice ? offer : best,
  );
}

/** Search one inventory direction. Does not reuse the opposite-leg fare. */
export function generateLegOffers(params: {
  origin: string;
  destination: string;
  departureDate: string;
  cabinClass: CabinClass;
  tripType?: TripType;
  adults?: number;
  children?: number;
  infants?: number;
  currency?: FlightSearchParams["currency"];
}): FlightOffer[] {
  return generateMockOffers({
    tripType: params.tripType ?? "ONE_WAY",
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    departureDate: params.departureDate,
    adults: params.adults ?? 1,
    children: params.children ?? 0,
    infants: params.infants ?? 0,
    cabinClass: params.cabinClass,
    currency: params.currency ?? "PKR",
  });
}

function toFareLeg(
  offer: FlightOffer,
  origin: string,
  destination: string,
  date: string,
): RoundTripFareLeg {
  return {
    origin,
    destination,
    date,
    supplierFare: Math.round(offer.totalPrice),
    currency: offer.currency || "PKR",
    offerId: offer.id,
  };
}

/**
 * Display-only cheapest fares for the fare bar.
 * Booking totals must be recalculated on the server from selected offers.
 */
export function summarizeRoundTripFares(input: {
  tripType: TripType;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  cabinClass: CabinClass;
  adults?: number;
  children?: number;
  infants?: number;
  currency?: FlightSearchParams["currency"];
}): RoundTripFareSummary {
  const origin = input.origin.toUpperCase();
  const destination = input.destination.toUpperCase();
  const outboundOffers = generateLegOffers({
    origin,
    destination,
    departureDate: input.departureDate,
    cabinClass: input.cabinClass,
    tripType: input.tripType,
    adults: input.adults,
    children: input.children,
    infants: input.infants,
    currency: input.currency,
  });
  const outboundOffer = cheapestOffer(outboundOffers);
  const outbound = outboundOffer
    ? toFareLeg(outboundOffer, origin, destination, input.departureDate)
    : null;

  let inbound: RoundTripFareLeg | null = null;
  if (input.tripType === "ROUND_TRIP" && input.returnDate) {
    const reversed = reverseRoute(origin, destination);
    const inboundOffers = generateLegOffers({
      origin: reversed.origin,
      destination: reversed.destination,
      departureDate: input.returnDate,
      cabinClass: input.cabinClass,
      tripType: input.tripType,
      adults: input.adults,
      children: input.children,
      infants: input.infants,
      currency: input.currency,
    });
    const inboundOffer = cheapestOffer(inboundOffers);
    inbound = inboundOffer
      ? toFareLeg(
          inboundOffer,
          reversed.origin,
          reversed.destination,
          input.returnDate,
        )
      : null;
  }

  return {
    tripType: input.tripType === "ROUND_TRIP" ? "ROUND_TRIP" : "ONE_WAY",
    origin,
    destination,
    departureDate: input.departureDate,
    returnDate: input.returnDate,
    outbound,
    inbound,
    combinedSupplierFare: (outbound?.supplierFare ?? 0) + (inbound?.supplierFare ?? 0),
    currency: outbound?.currency ?? inbound?.currency ?? input.currency ?? "PKR",
  };
}

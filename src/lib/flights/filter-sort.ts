import type {
  DurationBucket,
  FlightFiltersState,
  FlightOffer,
  FlightSortOption,
  TimeOfDayBucket,
} from "@/types/flight";

export const defaultFlightFilters = (): FlightFiltersState => ({
  minPrice: null,
  maxPrice: null,
  stops: [],
  departureBuckets: [],
  arrivalBuckets: [],
  durationBuckets: [],
  baggageIncludedOnly: false,
  airlines: [],
  refundableOnly: false,
});

export function getTimeOfDayBucket(iso: string): TimeOfDayBucket {
  const hour = new Date(iso).getHours();
  if (hour >= 5 && hour < 8) return "early_morning";
  if (hour >= 8 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function getDurationBucket(minutes: number): DurationBucket {
  if (minutes <= 180) return "short";
  if (minutes <= 420) return "medium";
  return "long";
}

/**
 * Recommended score (higher is better).
 * This is an internal demo ranking — not an airline recommendation engine.
 * Weights: lower price, fewer stops, shorter duration, earlier daytime departure.
 */
export function scoreRecommended(offer: FlightOffer): number {
  const priceScore = Math.max(0, 400_000 - offer.totalPrice) / 1000;
  const stopScore = (2 - Math.min(offer.stops, 2)) * 40;
  const durationScore = Math.max(0, 900 - offer.durationMinutes) / 10;
  const departureHour = new Date(offer.segments[0]?.departureAt ?? "").getHours();
  const departureScore =
    departureHour >= 8 && departureHour <= 18 ? 25 : departureHour >= 6 ? 10 : 0;
  const refundScore = offer.refundable ? 15 : 0;
  return priceScore + stopScore + durationScore + departureScore + refundScore;
}

export function sortOffers(
  offers: FlightOffer[],
  sort: FlightSortOption,
): FlightOffer[] {
  const copy = [...offers];
  switch (sort) {
    case "cheapest":
      return copy.sort((a, b) => a.totalPrice - b.totalPrice);
    case "fastest":
      return copy.sort((a, b) => a.durationMinutes - b.durationMinutes);
    case "earliest_departure":
      return copy.sort((a, b) => {
        const aTime = a.segments[0]?.departureAt ?? "";
        const bTime = b.segments[0]?.departureAt ?? "";
        return aTime.localeCompare(bTime);
      });
    case "latest_arrival":
      return copy.sort((a, b) => {
        const aLast = a.segments[a.segments.length - 1]?.arrivalAt ?? "";
        const bLast = b.segments[b.segments.length - 1]?.arrivalAt ?? "";
        return bLast.localeCompare(aLast);
      });
    case "recommended":
    default:
      return copy.sort((a, b) => scoreRecommended(b) - scoreRecommended(a));
  }
}

export function filterOffers(
  offers: FlightOffer[],
  filters: FlightFiltersState,
): FlightOffer[] {
  return offers.filter((offer) => {
    if (filters.minPrice != null && offer.totalPrice < filters.minPrice) return false;
    if (filters.maxPrice != null && offer.totalPrice > filters.maxPrice) return false;

    if (filters.stops.length > 0) {
      const matchesStop = filters.stops.some((stop) => {
        if (stop === "nonstop") return offer.stops === 0;
        if (stop === "one_stop") return offer.stops === 1;
        return offer.stops >= 2;
      });
      if (!matchesStop) return false;
    }

    const departure = offer.segments[0]?.departureAt;
    const arrival = offer.segments[offer.segments.length - 1]?.arrivalAt;

    if (filters.departureBuckets.length > 0 && departure) {
      if (!filters.departureBuckets.includes(getTimeOfDayBucket(departure))) return false;
    }

    if (filters.arrivalBuckets.length > 0 && arrival) {
      if (!filters.arrivalBuckets.includes(getTimeOfDayBucket(arrival))) return false;
    }

    if (filters.durationBuckets.length > 0) {
      if (!filters.durationBuckets.includes(getDurationBucket(offer.durationMinutes))) {
        return false;
      }
    }

    if (filters.baggageIncludedOnly && !offer.baggageIncluded) return false;
    if (filters.refundableOnly && !offer.refundable) return false;

    if (filters.airlines.length > 0 && !filters.airlines.includes(offer.airlineId)) {
      return false;
    }

    return true;
  });
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatFlightTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Karachi",
  }).format(new Date(iso));
}

export function formatFlightDate(isoOrDate: string): string {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)
    ? `${isoOrDate}T12:00:00+05:00`
    : isoOrDate;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(new Date(value));
}

export function formatBaggageLabel(offer: {
  baggageKg: number;
  baggageIncluded: boolean;
}): string {
  if (offer.baggageIncluded && offer.baggageKg > 0) {
    return `Baggage ${offer.baggageKg} KG`;
  }
  return "Baggage allowance subject to fare rules.";
}

export function formatPrice(amount: number, currency = "PKR"): string {
  return `${currency} ${amount.toLocaleString("en-PK")}`;
}

export function stopsLabel(stops: number): string {
  if (stops === 0) return "Nonstop";
  if (stops === 1) return "1 Stop";
  return `${stops} Stops`;
}

/**
 * Booking funnel configuration.
 * Age bands are project defaults — supplier-specific rules can override later.
 */

export const bookingProgressSteps = [
  { id: 1, key: "search", label: "Search", href: "/flights" },
  { id: 2, key: "flight", label: "Flight", href: "/flights/results" },
  { id: 3, key: "passenger", label: "Passenger", href: "/booking/passengers" },
  { id: 4, key: "review", label: "Review", href: "/booking/review" },
  { id: 5, key: "payment", label: "Payment", href: "/booking/payment" },
  { id: 6, key: "confirmation", label: "Confirmation", href: null },
] as const;

export type BookingProgressKey = (typeof bookingProgressSteps)[number]["key"];

/** Configurable passenger age bands (years). Not airline-universal rules. */
export const passengerAgeRules = {
  adultMinYears: 12,
  childMinYears: 2,
  childMaxYears: 11,
  infantMinYears: 0,
  infantMaxYears: 1,
} as const;

/**
 * GB International Travel agency markup (server-side only).
 * PKR ≤ 50,000 → 5% (covers the 25,000–50,000 band and lower fares)
 * PKR > 50,000 → 3.5%
 */
export const bookingPricingConfig = {
  currency: "PKR",
  /** @deprecated Prefer calculateAgencyMarkup — kept for legacy references. */
  serviceFeeAmount: 1500,
  taxRate: 0.12,
  markupThresholdPkr: 50_000,
  markupRateStandard: 0.05,
  markupRateHigh: 0.035,
} as const;

/** Draft bookings can eventually expire after this many minutes. */
export const BOOKING_DRAFT_EXPIRY_MINUTES = Number(
  process.env.BOOKING_DRAFT_EXPIRY_MINUTES ?? 60,
);

export const bookingCookieName = "gb_booking_session";

export const cabinClasses = [
  { value: "ECONOMY", label: "Economy" },
  { value: "PREMIUM_ECONOMY", label: "Premium Economy" },
  { value: "BUSINESS", label: "Business" },
  { value: "FIRST", label: "First" },
] as const;

export const tripTypes = [
  { value: "ROUND_TRIP", label: "Round Trip" },
  { value: "ONE_WAY", label: "One Way" },
  { value: "MULTI_CITY", label: "Multi City" },
] as const;

export const genderOptions = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "UNSPECIFIED", label: "Prefer not to say" },
] as const;

export const passengerTypeLabels = {
  ADULT: "Adult",
  CHILD: "Child",
  INFANT: "Infant",
} as const;

/** @deprecated Prefer bookingProgressSteps for the funnel UI */
export const bookingSteps = [
  { id: 1, key: "search", label: "Search" },
  { id: 2, key: "results", label: "Flight Results" },
  { id: 3, key: "passengers", label: "Passenger Details" },
  { id: 4, key: "payment", label: "Review & Payment" },
  { id: 5, key: "confirmation", label: "Booking Confirmation" },
  { id: 6, key: "my-trip", label: "My Trip" },
] as const;

export type BookingStepKey = (typeof bookingSteps)[number]["key"];

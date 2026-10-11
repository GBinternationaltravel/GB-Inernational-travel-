/**
 * Pure helpers for the printable e-ticket / itinerary receipt.
 * No database or auth access here — keep this file safe to unit test.
 */

import { cabinClasses, passengerTypeLabels } from "@/config/booking";
import { getAirlineByCode, getAirlineById } from "@/data/airlines";
import { getAirportByCode } from "@/data/airports";
import type { OfferSnapshot } from "@/lib/booking/pricing";
import { formatFlightNumber, splitFlightNumber } from "@/lib/flights/flight-number";

/** All e-ticket times are shown in Pakistan local time. */
export const ETICKET_TIME_ZONE = "Asia/Karachi";
export const ETICKET_TIME_ZONE_LABEL = "PKT";

/** Hours before departure to reach the airport. */
export const CHECK_IN_HOURS = { domestic: 2, international: 3 } as const;

/** Site path of the printable e-ticket for a booking. */
export function eTicketPath(reference: string): string {
  return `/my-trips/${encodeURIComponent(reference)}/ticket`;
}

/** Absolute e-ticket URL (for emails). Trailing slashes on the base are ignored. */
export function eTicketUrl(reference: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${eTicketPath(reference)}`;
}

/**
 * The manual issuer stores `MANUAL-<PNR>` when no real ticket number was typed.
 * That is a placeholder, not an airline e-ticket number, so it is never printed.
 */
export function isPlaceholderTicketNumber(value: string): boolean {
  return /^MANUAL-/i.test(value.trim());
}

/** Trimmed, upper-cased, de-duplicated real ticket numbers (placeholders removed). */
export function cleanTicketNumbers(values: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = (raw ?? "").trim().toUpperCase();
    if (!value || isPlaceholderTicketNumber(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/** Airline PNR: first PNR on an issued Ticket row, else the booking's supplier reference. */
export function resolvePnr(input: {
  ticketPnrs?: ReadonlyArray<string | null | undefined>;
  supplierBookingRef?: string | null;
}): string | null {
  const fromTickets = (input.ticketPnrs ?? [])
    .map((value) => (value ?? "").trim().toUpperCase())
    .find(Boolean);
  if (fromTickets) return fromTickets;
  const fallback = (input.supplierBookingRef ?? "").trim().toUpperCase();
  return fallback || null;
}

/** A booking is ticketed once it is CONFIRMED and has an airline PNR on file. */
export function isBookingTicketed(input: {
  status: string;
  pnr?: string | null;
}): boolean {
  return input.status === "CONFIRMED" && Boolean(input.pnr && input.pnr.trim());
}

/** Date + 24h time in Pakistan local time, e.g. { date: "Sat, 12 Sep 2026", time: "11:13" }. */
export function formatTicketDateTime(iso: string): { date: string; time: string } {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return { date: "—", time: "—" };
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: ETICKET_TIME_ZONE,
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const day = part("day").padStart(2, "0");
  const hour = part("hour") === "24" ? "00" : part("hour");
  return {
    date: `${part("weekday")}, ${day} ${part("month")} ${part("year")}`,
    time: `${hour}:${part("minute")}`,
  };
}

/** Date only in Pakistan local time, e.g. "Sat, 12 Sep 2026". */
export function formatTicketDate(iso: string): string {
  return formatTicketDateTime(iso).date;
}

/** Whole-PKR amount, e.g. "PKR 89,507". */
export function formatTicketAmount(amount: number, currency = "PKR"): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  return `${currency} ${rounded.toLocaleString("en-PK")}`;
}

export function formatDurationLabel(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/** Both airports in Pakistan → domestic. Unknown airports count as international (safer advice). */
export function isDomesticRoute(origin: string, destination: string): boolean {
  const from = getAirportByCode(origin);
  const to = getAirportByCode(destination);
  return from?.country === "Pakistan" && to?.country === "Pakistan";
}

export function checkInHoursFor(domestic: boolean): number {
  return domestic ? CHECK_IN_HOURS.domestic : CHECK_IN_HOURS.international;
}

/** Two-letter airline code from the snapshot (airlineId is the lower-cased IATA code). */
export function airlineCodeFor(offer: Pick<OfferSnapshot, "airlineId" | "flightNumber">): string {
  const byId = offer.airlineId ? getAirlineById(offer.airlineId) : undefined;
  if (byId) return byId.iataCode;
  if (offer.airlineId && /^[a-z0-9]{2}$/i.test(offer.airlineId)) {
    return offer.airlineId.toUpperCase();
  }
  // Designators may contain digits (9P, G9, 6E): read the prefix with the shared parser.
  return splitFlightNumber(offer.flightNumber)?.carrier ?? "";
}

export type ETicketAirport = { code: string; city: string; name: string | null };

/**
 * Local clock time at an airport outside Pakistan time, e.g. "05:00", or null when the
 * airport's time zone is unknown or matches Pakistan time at that moment.
 */
export function localTimeIfDifferent(iso: string, timeZone?: string | null): string | null {
  if (!timeZone || timeZone === ETICKET_TIME_ZONE) return null;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return null;
  try {
    const fmt = (zone: string) =>
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: zone,
      }).format(value);
    const local = fmt(timeZone);
    return local === fmt(ETICKET_TIME_ZONE) ? null : local;
  } catch {
    return null; // invalid zone name in data
  }
}

export function describeAirport(code: string, fallbackCity?: string | null): ETicketAirport {
  const airport = getAirportByCode(code);
  return {
    code: code.toUpperCase(),
    city: fallbackCity || airport?.city || code.toUpperCase(),
    name: airport?.name ?? null,
  };
}

export function cabinLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return cabinClasses.find((item) => item.value === value)?.label ?? value;
}

export function baggageLabel(offer: Pick<OfferSnapshot, "baggageKg" | "baggageIncluded">): string {
  if (offer.baggageIncluded && offer.baggageKg > 0) return `${offer.baggageKg} kg checked baggage`;
  if (offer.baggageIncluded) return "Included (see airline rules)";
  return "Not included — check with the airline";
}

export function passengerTypeLabel(type: string): string {
  return passengerTypeLabels[type as keyof typeof passengerTypeLabels] ?? type;
}

export function passengerFullName(passenger: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}): string {
  return [passenger.firstName, passenger.middleName, passenger.lastName]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

export type ETicketSourceBooking = {
  reference: string;
  status: string;
  tripType?: string | null;
  currency: string;
  totalAmount: number;
  feesAmount: number;
  subtotalAmount: number;
  taxesAmount: number;
  supplierBookingRef?: string | null;
  updatedAt: string;
  offerSnapshot: OfferSnapshot;
  passengers: Array<{
    id: string;
    passengerType: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
  }>;
};

export type ETicketSourceTicket = {
  ticketNumber?: string | null;
  pnr?: string | null;
  issuedAt?: string | Date | null;
};

export type ETicketView = {
  reference: string;
  status: string;
  ticketed: boolean;
  pnr: string | null;
  ticketNumbers: string[];
  issuedAt: string | null;
  domestic: boolean;
  checkInHours: number;
  /** Shown when the stored flight may not be the whole journey (stops or return leg). */
  itineraryNote: string | null;
  passengers: Array<{ id: string; name: string; type: string }>;
  segment: {
    airlineName: string;
    airlineCode: string;
    flightNumber: string;
    from: ETicketAirport;
    to: ETicketAirport;
    departure: { date: string; time: string; localTime: string | null };
    arrival: { date: string; time: string; localTime: string | null };
    duration: string;
    stops: number;
    cabin: string;
    baggage: string;
  };
  /**
   * Customer-facing price: one all-inclusive amount. The GB service fee is folded in
   * and deliberately not exposed here (admin pages show the full breakdown).
   */
  price: {
    currency: string;
    total: number;
  };
};

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Note for journeys whose connections or return leg are not stored on the booking. */
export function itineraryNoteFor(input: { stops: number; tripType?: string | null }): string | null {
  const stops = Math.max(0, Math.floor(input.stops || 0));
  const multiLeg = Boolean(input.tripType) && input.tripType !== "ONE_WAY";
  if (stops === 0 && !multiLeg) return null;
  const parts: string[] = [];
  if (stops > 0) parts.push(`This flight has ${stops} stop${stops > 1 ? "s" : ""}.`);
  parts.push(
    multiLeg
      ? "This receipt shows the flight stored with your booking. Check your full itinerary, including any return or connecting flights, with the airline using your PNR."
      : "Check connection details with the airline using your PNR.",
  );
  return parts.join(" ");
}

/** Builds everything the e-ticket page prints from stored booking data (no recalculation). */
export function buildETicketView(input: {
  booking: ETicketSourceBooking;
  tickets?: ETicketSourceTicket[];
  confirmedAt?: string | Date | null;
  /** IATA code → IANA time zone (from the Airport table), used for local-time hints. */
  airportTimeZones?: Record<string, string | null | undefined>;
}): ETicketView {
  const { booking } = input;
  const tickets = input.tickets ?? [];
  const offer = booking.offerSnapshot;
  const pricing = offer.pricing;

  const pnr = resolvePnr({
    ticketPnrs: tickets.map((ticket) => ticket.pnr),
    supplierBookingRef: booking.supplierBookingRef,
  });

  const issuedDates = tickets
    .map((ticket) => toIso(ticket.issuedAt))
    .filter((value): value is string => Boolean(value))
    .sort();
  const issuedAt = issuedDates[0] ?? toIso(input.confirmedAt) ?? toIso(booking.updatedAt);

  const domestic = isDomesticRoute(offer.origin, offer.destination);
  const currency = pricing?.currency || booking.currency || "PKR";
  const total = typeof pricing?.total === "number" ? pricing.total : booking.totalAmount;

  const airlineCode = airlineCodeFor(offer);
  const airlineName =
    offer.airlineName || (airlineCode ? getAirlineByCode(airlineCode)?.name : undefined) || "—";

  return {
    reference: booking.reference,
    status: booking.status,
    ticketed: isBookingTicketed({ status: booking.status, pnr }),
    pnr,
    ticketNumbers: cleanTicketNumbers(tickets.map((ticket) => ticket.ticketNumber)),
    issuedAt,
    domestic,
    checkInHours: checkInHoursFor(domestic),
    itineraryNote: itineraryNoteFor({ stops: offer.stops ?? 0, tripType: booking.tripType }),
    passengers: booking.passengers.map((passenger) => ({
      id: passenger.id,
      name: passengerFullName(passenger),
      type: passengerTypeLabel(passenger.passengerType),
    })),
    segment: {
      airlineName,
      airlineCode,
      flightNumber: formatFlightNumber(offer.flightNumber, airlineCode) || "—",
      from: describeAirport(offer.origin, offer.originCity),
      to: describeAirport(offer.destination, offer.destinationCity),
      departure: {
        ...formatTicketDateTime(offer.departureAt),
        localTime: localTimeIfDifferent(
          offer.departureAt,
          input.airportTimeZones?.[offer.origin?.toUpperCase()],
        ),
      },
      arrival: {
        ...formatTicketDateTime(offer.arrivalAt),
        localTime: localTimeIfDifferent(
          offer.arrivalAt,
          input.airportTimeZones?.[offer.destination?.toUpperCase()],
        ),
      },
      duration: formatDurationLabel(offer.durationMinutes),
      stops: offer.stops ?? 0,
      cabin: cabinLabel(offer.cabinClass),
      baggage: baggageLabel(offer),
    },
    price: {
      currency,
      total,
    },
  };
}

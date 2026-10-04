import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAirportByCode } from "@/data/airports";
import type {
  AirportSummary,
  CabinClass,
  FlightOffer,
  TripType,
} from "@/types/flight";
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

/**
 * Database-backed flight supplier ("inventory").
 *
 * Sells the flights the owner manages in Admin → Flights. Each inventory flight is a
 * Prisma `Flight` (providerCode = "INVENTORY") with one `FlightSegment`, plus a small
 * JSON settings row (`SiteSetting` key `flight-inventory:<flightId>`) holding fare, seats
 * and the schedule (single date or weekly days). No Prisma schema change is required.
 *
 * Bookings are not sent to an airline: they are confirmed and ticketed manually by the
 * ticket desk via Admin → Bookings → Issue Ticket (same as the mock/manual path).
 */

export const INVENTORY_SUPPLIER_CODE = "INVENTORY";
export const INVENTORY_META_PREFIX = "flight-inventory:";
export const DEFAULT_AIRPORT_TIMEZONE = "Asia/Karachi";

/** How long a quoted offer is held before the booking flow must revalidate it. */
const OFFER_TTL_MINUTES = 30;
/** Stop selling a departure this many minutes before it leaves. */
export const BOOKING_CUTOFF_MINUTES = 120;
/** Booking statuses that hold seats on a departure. */
const SEAT_HOLDING_STATUSES = [
  "PAYMENT_PROCESSING",
  "PAYMENT_RECEIVED",
  "TICKETING_PENDING",
  "CONFIRMED",
] as const;

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const inventoryMetaSchema = z.object({
  version: z.literal(1).default(1),
  isActive: z.boolean().default(true),
  /** Base fare per seat (adult/child), PKR. */
  fare: z.number().nonnegative(),
  /** Taxes per seat (adult/child), PKR. */
  taxes: z.number().nonnegative().default(0),
  /** All-in fare per infant (lap, no seat), PKR. */
  infantFare: z.number().nonnegative().default(0),
  /** Seats for sale on each departure. */
  seats: z.number().int().nonnegative(),
  /** 0 = Sunday … 6 = Saturday. Empty = single dated flight on startDate. */
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  /** Flight date (dated flight) or first day of the weekly schedule. */
  startDate: dateSchema,
  /** Last day of the weekly schedule (optional, inclusive). */
  endDate: dateSchema.nullable().default(null),
  /** Local time at the origin airport. */
  departureTime: timeSchema,
  /** Local time at the destination airport (next day is inferred automatically). */
  arrivalTime: timeSchema,
  baggageKg: z.number().int().nonnegative().default(20),
  refundable: z.boolean().default(false),
  fareNotes: z.string().nullable().default(null),
});

export type InventoryFlightMeta = z.infer<typeof inventoryMetaSchema>;

export function inventoryMetaKey(flightId: string): string {
  return `${INVENTORY_META_PREFIX}${flightId}`;
}

export function parseInventoryMeta(value: unknown): InventoryFlightMeta | null {
  const parsed = inventoryMetaSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function loadInventoryMeta(
  flightIds: string[],
): Promise<Map<string, InventoryFlightMeta>> {
  const map = new Map<string, InventoryFlightMeta>();
  if (flightIds.length === 0) return map;
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: flightIds.map(inventoryMetaKey) } },
  });
  for (const row of rows) {
    const meta = parseInventoryMeta(row.value);
    if (meta) map.set(row.key.slice(INVENTORY_META_PREFIX.length), meta);
  }
  return map;
}

/* ───────────────────────── Date / time helpers ───────────────────────── */

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function safeTimeZone(timeZone?: string | null): string {
  const candidate = timeZone?.trim() || DEFAULT_AIRPORT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_AIRPORT_TIMEZONE;
  }
}

function timeZoneOffsetMinutes(timeZone: string, utcMs: number): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(utcMs))
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - utcMs) / 60_000);
}

/** Convert a wall-clock date + time in an IANA time zone to a UTC Date. */
export function localDateTimeToUtc(date: string, time: string, timeZone?: string | null): Date {
  const tz = safeTimeZone(timeZone);
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  const first = timeZoneOffsetMinutes(tz, naive);
  let utc = naive - first * 60_000;
  const second = timeZoneOffsetMinutes(tz, utc);
  if (second !== first) utc = naive - second * 60_000;
  return new Date(utc);
}

function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Does this inventory flight operate on the given local departure date? */
export function operatesOn(meta: InventoryFlightMeta, date: string): boolean {
  if (date < meta.startDate) return false;
  if (meta.daysOfWeek.length === 0) return date === meta.startDate;
  if (meta.endDate && date > meta.endDate) return false;
  return meta.daysOfWeek.includes(weekdayOf(date));
}

/** UTC departure/arrival for a given local departure date. */
export function departureTimes(
  meta: InventoryFlightMeta,
  date: string,
  originTimeZone?: string | null,
  destinationTimeZone?: string | null,
) {
  const departureAt = localDateTimeToUtc(date, meta.departureTime, originTimeZone);
  let arrivalAt = localDateTimeToUtc(date, meta.arrivalTime, destinationTimeZone);
  // Overnight flights: arrival local time earlier than departure → next day.
  for (let i = 0; i < 2 && arrivalAt.getTime() <= departureAt.getTime(); i += 1) {
    arrivalAt = new Date(arrivalAt.getTime() + 24 * 60 * 60_000);
  }
  const durationMinutes = Math.max(
    1,
    Math.round((arrivalAt.getTime() - departureAt.getTime()) / 60_000),
  );
  return { departureAt, arrivalAt, durationMinutes };
}

/* ───────────────────────── Offer ids ───────────────────────── */

type PaxCounts = { adults: number; children: number; infants: number };

/** inv_<flightId>_<YYYY-MM-DD>_<adults>-<children>-<infants> */
export function buildInventoryOfferId(flightId: string, date: string, pax: PaxCounts): string {
  return `inv_${flightId}_${date}_${pax.adults}-${pax.children}-${pax.infants}`;
}

export function parseInventoryOfferId(
  id: string,
): { flightId: string; date: string; pax: PaxCounts } | null {
  const match = /^inv_([a-zA-Z0-9]+)_(\d{4}-\d{2}-\d{2})_(\d)-(\d)-(\d)$/.exec(id.trim());
  if (!match) return null;
  return {
    flightId: match[1]!,
    date: match[2]!,
    pax: {
      adults: Math.max(1, Number(match[3])),
      children: Number(match[4]),
      infants: Number(match[5]),
    },
  };
}

/* ───────────────────────── Prisma loading ───────────────────────── */

const airportInclude = { city: { include: { country: true } } } as const;

const flightInclude = {
  airline: true,
  segments: {
    orderBy: { segmentOrder: "asc" },
    include: {
      originAirport: { include: airportInclude },
      destinationAirport: { include: airportInclude },
    },
  },
} satisfies Prisma.FlightInclude;

type InventoryFlightRecord = Prisma.FlightGetPayload<{ include: typeof flightInclude }>;
type AirportRecord = InventoryFlightRecord["segments"][number]["originAirport"];

function toAirportSummary(airport: AirportRecord): AirportSummary {
  const fallback = getAirportByCode(airport.iataCode);
  return {
    iataCode: airport.iataCode,
    name: airport.name,
    city: airport.city?.name ?? fallback?.city ?? airport.name,
    country: airport.city?.country?.name ?? fallback?.country ?? "",
  };
}

async function seatsTaken(flightId: string, date: string): Promise<number> {
  const prefix = `inv_${flightId}_${date}_`;
  const now = new Date();
  const agg = await prisma.booking.aggregate({
    where: {
      selectedOfferId: { startsWith: prefix },
      OR: [
        { status: { in: [...SEAT_HOLDING_STATUSES] } },
        {
          status: "PENDING_PAYMENT",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      ],
    },
    _sum: { adults: true, children: true },
  });
  return (agg._sum.adults ?? 0) + (agg._sum.children ?? 0);
}

function cabinLabel(cabin: CabinClass): string {
  return cabin
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type BuildResult =
  | { ok: true; offer: FlightOffer }
  | { ok: false; reason: "INACTIVE" | "NOT_OPERATING" | "DEPARTED" | "NO_SEATS" };

async function buildOffer(options: {
  flight: InventoryFlightRecord;
  meta: InventoryFlightMeta;
  date: string;
  pax: PaxCounts;
  tripType: TripType;
}): Promise<BuildResult> {
  const { flight, meta, date, pax } = options;
  const segment = flight.segments[0];
  if (
    !segment ||
    !meta.isActive ||
    flight.status === "CANCELLED" ||
    !flight.airline.isActive ||
    flight.providerCode !== INVENTORY_SUPPLIER_CODE
  ) {
    return { ok: false, reason: "INACTIVE" };
  }
  if (!operatesOn(meta, date)) return { ok: false, reason: "NOT_OPERATING" };

  const { departureAt, arrivalAt, durationMinutes } = departureTimes(
    meta,
    date,
    segment.originAirport.timezone,
    segment.destinationAirport.timezone,
  );
  if (departureAt.getTime() < Date.now() + BOOKING_CUTOFF_MINUTES * 60_000) {
    return { ok: false, reason: "DEPARTED" };
  }

  const seatsNeeded = pax.adults + pax.children;
  const seatsRemaining = Math.max(0, meta.seats - (await seatsTaken(flight.id, date)));
  if (seatsRemaining < Math.max(1, seatsNeeded)) return { ok: false, reason: "NO_SEATS" };

  const baseFare = Math.round(meta.fare * seatsNeeded + meta.infantFare * pax.infants);
  const infantFareTotal = Math.round(meta.infantFare * pax.infants);
  const taxes = Math.round(meta.taxes * seatsNeeded);
  const totalPrice = baseFare + taxes;
  const airline = { iataCode: flight.airline.iataCode, name: flight.airline.name };
  const travellers = seatsNeeded + pax.infants;

  return {
    ok: true,
    offer: {
      id: buildInventoryOfferId(flight.id, date, pax),
      providerCode: INVENTORY_SUPPLIER_CODE,
      supplierCode: INVENTORY_SUPPLIER_CODE,
      supplierOfferId: `inv-${flight.id}-${date}`,
      supplierSessionRef: null,
      expiresAt: new Date(Date.now() + OFFER_TTL_MINUTES * 60_000).toISOString(),
      isMock: false,
      // Lower-case IATA matches the airline ids used by the results filters.
      airlineId: flight.airline.iataCode.toLowerCase(),
      tripType: options.tripType,
      cabinClass: flight.cabinClass as CabinClass,
      currency: "PKR",
      totalPrice,
      segments: [
        {
          origin: toAirportSummary(segment.originAirport),
          destination: toAirportSummary(segment.destinationAirport),
          departureAt: departureAt.toISOString(),
          arrivalAt: arrivalAt.toISOString(),
          durationMinutes,
          flightNumber: flight.flightNumber,
          airline,
          aircraftCode: segment.aircraftCode ?? undefined,
        },
      ],
      stops: 0,
      durationMinutes,
      baggageKg: meta.baggageKg,
      baggageIncluded: meta.baggageKg > 0,
      seatsRemaining,
      refundable: meta.refundable,
      marketingCarrier: airline,
      operatingCarrier: airline,
      fareFamily: `${cabinLabel(flight.cabinClass as CabinClass)} · ${travellers} ${
        travellers === 1 ? "traveller" : "travellers"
      }`,
      baseFare,
      taxes,
      fees: 0,
      // Lets the GB service fee be charged per seat (adults + children, not infants).
      pricedPassengers: { adults: pax.adults, children: pax.children, infants: pax.infants },
      infantFareTotal,
      changeable: null,
      fareRules:
        meta.fareNotes ??
        "Fare conditions are confirmed by GB International Travel when your ticket is issued.",
    },
  };
}

async function loadOfferFromId(internalOfferId: string): Promise<{
  parsed: NonNullable<ReturnType<typeof parseInventoryOfferId>>;
  result: BuildResult;
} | null> {
  const parsed = parseInventoryOfferId(internalOfferId);
  if (!parsed) return null;
  const flight = await prisma.flight.findUnique({
    where: { id: parsed.flightId },
    include: flightInclude,
  });
  if (!flight) return null;
  const meta = (await loadInventoryMeta([flight.id])).get(flight.id);
  if (!meta) return null;
  const result = await buildOffer({
    flight,
    meta,
    date: parsed.date,
    pax: parsed.pax,
    tripType: "ONE_WAY",
  });
  return { parsed, result };
}

function asSupplierUnavailable(error: unknown): never {
  if (error instanceof SupplierError) throw error;
  console.error("[inventory-supplier]", error instanceof Error ? error.message : error);
  throw new SupplierError(
    "SUPPLIER_UNAVAILABLE",
    "Flight inventory database is unavailable.",
    true,
  );
}

/* ───────────────────────── Supplier ───────────────────────── */

export class InventoryFlightSupplier implements FlightSupplier {
  readonly code = INVENTORY_SUPPLIER_CODE;
  readonly name = "GB International Travel inventory";
  readonly isMock = false;

  async searchFlights(request: SupplierSearchRequest) {
    return withSupplierLogging(this.code, "searchFlights", async () => {
      const origin = request.origin.trim().toUpperCase();
      const destination = request.destination.trim().toUpperCase();
      const date = request.departureDate;
      const pax: PaxCounts = {
        adults: request.adults,
        children: request.children ?? 0,
        infants: request.infants ?? 0,
      };

      try {
        const flights = await prisma.flight.findMany({
          where: {
            providerCode: INVENTORY_SUPPLIER_CODE,
            cabinClass: request.cabinClass,
            status: { not: "CANCELLED" },
            airline: { isActive: true },
            segments: {
              some: {
                segmentOrder: 1,
                originAirport: { iataCode: origin },
                destinationAirport: { iataCode: destination },
              },
            },
          },
          include: flightInclude,
          take: 200,
        });
        const metas = await loadInventoryMeta(flights.map((flight) => flight.id));

        const built = await Promise.all(
          flights.map(async (flight) => {
            const meta = metas.get(flight.id);
            if (!meta) return null;
            const result = await buildOffer({
              flight,
              meta,
              date,
              pax,
              tripType: request.tripType,
            });
            return result.ok ? result.offer : null;
          }),
        );

        const offers = built
          .filter((offer): offer is FlightOffer => Boolean(offer))
          .sort((a, b) => a.segments[0]!.departureAt.localeCompare(b.segments[0]!.departureAt));

        return {
          offers,
          searchedAt: new Date().toISOString(),
          supplierCode: this.code,
          isMock: false,
        };
      } catch (error) {
        asSupplierUnavailable(error);
      }
    });
  }

  async getOffer(input: {
    internalOfferId: string;
    supplierOfferId?: string;
  }): Promise<FlightOffer | null> {
    return withSupplierLogging(this.code, "getOffer", async () => {
      try {
        const loaded = await loadOfferFromId(input.internalOfferId);
        if (!loaded || !loaded.result.ok) return null;
        return loaded.result.offer;
      } catch (error) {
        asSupplierUnavailable(error);
      }
    });
  }

  async revalidateOffer(input: RevalidateOfferInput): Promise<RevalidateOfferResult> {
    return withSupplierLogging(
      this.code,
      "revalidateOffer",
      async (): Promise<RevalidateOfferResult> => {
        let loaded;
        try {
          loaded = await loadOfferFromId(input.internalOfferId);
        } catch (error) {
          asSupplierUnavailable(error);
        }

        if (!loaded || !loaded.result.ok) {
          const departed = loaded && !loaded.result.ok && loaded.result.reason === "DEPARTED";
          return {
            ok: false,
            status: departed ? "EXPIRED" : "NO_AVAILABILITY",
            offer: null,
            previousTotal: input.expectedTotal,
            message: departed
              ? "This departure is closed for online booking."
              : "This flight is no longer available.",
            isMock: false,
          };
        }

        const offer = loaded.result.offer;
        if (
          typeof input.expectedTotal === "number" &&
          Math.abs(input.expectedTotal - offer.totalPrice) >= 1
        ) {
          return {
            ok: false,
            status: "PRICE_CHANGED",
            offer,
            previousTotal: input.expectedTotal,
            currentTotal: offer.totalPrice,
            currency: offer.currency,
            message: "The fare for this flight has changed. Review the updated price before continuing.",
            isMock: false,
          };
        }

        return {
          ok: true,
          status: "VALID",
          offer,
          previousTotal: input.expectedTotal ?? offer.totalPrice,
          currentTotal: offer.totalPrice,
          currency: offer.currency,
          message: "Fare and seats confirmed.",
          isMock: false,
        };
      },
      { internalOfferId: input.internalOfferId, supplierOfferId: input.supplierOfferId },
    );
  }

  async createBooking(input: SupplierCreateBookingInput): Promise<SupplierCreateBookingResult> {
    return withSupplierLogging(
      this.code,
      "createBooking",
      async () => {
        const { result } = await withIdempotency(
          input.idempotencyKey,
          "createBooking",
          async (): Promise<SupplierCreateBookingResult> => ({
            // No airline API: the booking is confirmed and ticketed manually by the ticket desk.
            ok: false,
            code: "NOT_SUPPORTED",
            isMock: false,
            message:
              "Inventory flights are confirmed manually by GB International Travel after payment (Admin → Bookings → Issue Ticket).",
          }),
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
              "Inventory flights are ticketed manually. Use Admin → Bookings → Issue Ticket after payment.",
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
      message: "Inventory bookings are cancelled manually by the ticket desk.",
    };
  }

  async getBooking() {
    return {
      ok: false as const,
      code: "NOT_SUPPORTED" as const,
      message: "Inventory bookings have no external supplier record.",
    };
  }

  async getBookingStatus() {
    return this.getBooking();
  }

  async getHealthStatus(): Promise<SupplierHealthStatus> {
    const logs = getSupplierLogState();
    let available = true;
    let message = "Inventory supplier reads admin-managed flights from the database.";
    try {
      const count = await prisma.flight.count({
        where: { providerCode: INVENTORY_SUPPLIER_CODE, status: { not: "CANCELLED" } },
      });
      message = `Inventory supplier: ${count} admin-managed flight(s) in the database.`;
    } catch {
      available = false;
      message = "Inventory supplier cannot reach the database.";
    }
    return {
      supplierCode: this.code,
      configured: true,
      available,
      isMock: false,
      lastSuccessfulRequestAt: logs.lastSuccessfulRequestAt,
      lastError: logs.lastError,
      message,
    };
  }
}

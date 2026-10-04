import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/security/audit";
import { AdminServiceError } from "@/services/admin-booking-service";
import {
  INVENTORY_SUPPLIER_CODE,
  WEEKDAY_LABELS,
  departureTimes,
  inventoryMetaKey,
  loadInventoryMeta,
  type InventoryFlightMeta,
} from "@/providers/flights/inventory-flight-supplier";

/**
 * Admin management of database-backed inventory flights (Admin → Flights).
 * Fare / seats / schedule live in SiteSetting `flight-inventory:<flightId>` (JSON),
 * so no Prisma schema change is needed.
 */

const blankToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const timeField = (label: string) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const raw = v.trim().replace(".", ":");
      const compact = /^(\d{1,2})(\d{2})$/.exec(raw);
      const parts = compact ? [compact[1], compact[2]] : raw.split(":");
      if (parts.length !== 2) return raw;
      return `${String(parts[0]).padStart(2, "0")}:${String(parts[1]).padStart(2, "0")}`;
    },
    z
      .string({ error: `${label} is required` })
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, `${label} must be HH:MM (24-hour), e.g. 07:30`),
  );

const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date");

const DAY_ALIASES: Record<string, number> = {
  sun: 0, sunday: 0, "0": 0, "7": 0,
  mon: 1, monday: 1, "1": 1,
  tue: 2, tues: 2, tuesday: 2, "2": 2,
  wed: 3, wednesday: 3, "3": 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, "4": 4,
  fri: 5, friday: 5, "5": 5,
  sat: 6, saturday: 6, "6": 6,
};

/** "Mon, Wed, Fri" / "daily" / "1 3 5" (Mon=1 … Sun=7) → [1,3,5]. Blank = dated flight. */
export function parseDaysOfWeek(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    return value.every((n) => Number.isInteger(n) && n >= 0 && n <= 6)
      ? [...new Set(value as number[])].sort()
      : null;
  }
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return [];
  if (["daily", "all", "everyday", "every day"].includes(raw)) return [0, 1, 2, 3, 4, 5, 6];
  const days = new Set<number>();
  for (const token of raw.split(/[\s,;/]+/).filter(Boolean)) {
    const day = DAY_ALIASES[token];
    if (day === undefined) return null;
    days.add(day);
  }
  return [...days].sort();
}

export function formatDaysOfWeek(days: number[]): string {
  if (days.length === 0) return "";
  if (days.length === 7) return "Daily";
  // Display Monday-first.
  return [...days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => WEEKDAY_LABELS[d])
    .join(", ");
}

const moneyNumber = (label: string) =>
  z.coerce.number({ error: `${label} must be a number` }).min(0, `${label} cannot be negative`);
const requiredMoney = (label: string) => z.preprocess(blankToUndefined, moneyNumber(label));
const optionalMoney = (label: string) =>
  z.preprocess(blankToUndefined, moneyNumber(label).optional());

export const inventoryFlightInputSchema = z
  .object({
    airlineId: z.string().trim().min(1, "Please choose an airline"),
    flightNumber: z
      .string()
      .trim()
      .toUpperCase()
      .transform((v) => v.replace(/[\s-]+/g, ""))
      .pipe(z.string().regex(/^([A-Z0-9]{2})?\d{1,4}[A-Z]?$/, "Flight number looks invalid (e.g. PK451)")),
    originCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Choose an origin airport"),
    destinationCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Choose a destination airport"),
    cabinClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]),
    departureTime: timeField("Departure time"),
    arrivalTime: timeField("Arrival time"),
    startDate: dateField,
    endDate: z.preprocess(blankToUndefined, dateField.optional()),
    daysOfWeek: z
      .unknown()
      .optional()
      .transform((v, ctx) => {
        const days = parseDaysOfWeek(v);
        if (!days) {
          ctx.addIssue({
            code: "custom",
            message: "Days of week: use e.g. Mon, Wed, Fri or Daily (leave blank for one date)",
          });
          return z.NEVER;
        }
        return days;
      }),
    fare: requiredMoney("Fare").pipe(z.number().positive("Fare must be more than 0")),
    taxes: optionalMoney("Taxes"),
    infantFare: optionalMoney("Infant fare"),
    seats: z.preprocess(
      blankToUndefined,
      z.coerce.number({ error: "Seats must be a number" }).int().min(0).max(999),
    ),
    baggageKg: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(100).optional()),
    refundable: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
    aircraftCode: z.preprocess(blankToUndefined, z.string().trim().max(10).optional()),
    fareNotes: z.preprocess(blankToUndefined, z.string().trim().max(500).optional()),
  })
  .superRefine((data, ctx) => {
    if (data.originCode === data.destinationCode) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationCode"],
        message: "Origin and destination must be different",
      });
    }
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Schedule end date cannot be before the start date",
      });
    }
  });

export type InventoryFlightInput = z.infer<typeof inventoryFlightInputSchema>;

export const inventoryFlightActiveSchema = z.object({
  action: z.literal("set-active"),
  id: z.string().min(1),
  isActive: z.boolean(),
});

async function ensurePrisma() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new AdminServiceError("PostgreSQL is unreachable. Admin flights require Prisma.", "STORE");
  }
}

async function resolveRefs(data: InventoryFlightInput) {
  const [airline, origin, destination] = await Promise.all([
    prisma.airline.findUnique({ where: { id: data.airlineId } }),
    prisma.airport.findUnique({ where: { iataCode: data.originCode } }),
    prisma.airport.findUnique({ where: { iataCode: data.destinationCode } }),
  ]);
  if (!airline) throw new AdminServiceError("Airline not found.", "VALIDATION");
  if (!origin) {
    throw new AdminServiceError(`Airport ${data.originCode} is not in Admin → Airports.`, "VALIDATION");
  }
  if (!destination) {
    throw new AdminServiceError(
      `Airport ${data.destinationCode} is not in Admin → Airports.`,
      "VALIDATION",
    );
  }
  const flightNumber = /^\d/.test(data.flightNumber)
    ? `${airline.iataCode}${data.flightNumber}`
    : data.flightNumber;
  return { airline, origin, destination, flightNumber };
}

function buildMeta(data: InventoryFlightInput, isActive: boolean): InventoryFlightMeta {
  const taxes = data.taxes ?? 0;
  const weekly = data.daysOfWeek.length > 0;
  return {
    version: 1,
    isActive,
    fare: Math.round(data.fare),
    taxes: Math.round(taxes),
    // Default infant (lap) fare: 10% of the seat fare.
    infantFare: Math.round(data.infantFare ?? (data.fare + taxes) * 0.1),
    seats: data.seats,
    daysOfWeek: data.daysOfWeek,
    startDate: data.startDate,
    endDate: weekly ? (data.endDate ?? null) : null,
    departureTime: data.departureTime,
    arrivalTime: data.arrivalTime,
    baggageKg: data.baggageKg ?? 20,
    refundable: data.refundable,
    fareNotes: data.fareNotes ?? null,
  };
}

function segmentData(
  meta: InventoryFlightMeta,
  origin: { id: string; timezone: string | null },
  destination: { id: string; timezone: string | null },
  aircraftCode?: string,
) {
  // Segment times store the first departure (dated flight) / schedule start.
  const times = departureTimes(meta, meta.startDate, origin.timezone, destination.timezone);
  return {
    segmentOrder: 1,
    originAirportId: origin.id,
    destinationAirportId: destination.id,
    departureAt: times.departureAt,
    arrivalAt: times.arrivalAt,
    durationMinutes: times.durationMinutes,
    aircraftCode: aircraftCode ?? null,
  };
}

export async function createInventoryFlight(input: { actorId: string; data: InventoryFlightInput }) {
  await ensurePrisma();
  const { airline, origin, destination, flightNumber } = await resolveRefs(input.data);
  const meta = buildMeta(input.data, input.data.isActive);

  const flight = await prisma.$transaction(async (tx) => {
    const created = await tx.flight.create({
      data: {
        airlineId: airline.id,
        flightNumber,
        cabinClass: input.data.cabinClass,
        status: "SCHEDULED",
        providerCode: INVENTORY_SUPPLIER_CODE,
        segments: {
          create: segmentData(meta, origin, destination, input.data.aircraftCode),
        },
      },
    });
    await tx.siteSetting.create({
      data: {
        key: inventoryMetaKey(created.id),
        label: `Inventory flight ${flightNumber} ${origin.iataCode}-${destination.iataCode}`,
        value: meta as unknown as Prisma.InputJsonValue,
      },
    });
    return created;
  });

  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_FLIGHT_CREATE",
    entityType: "Flight",
    entityId: flight.id,
    metadata: {
      flightNumber,
      route: `${origin.iataCode}-${destination.iataCode}`,
      fare: meta.fare,
      seats: meta.seats,
    },
  });
  return flight;
}

export async function updateInventoryFlight(input: {
  actorId: string;
  id: string;
  data: InventoryFlightInput;
}) {
  await ensurePrisma();
  const existing = await prisma.flight.findUnique({
    where: { id: input.id },
    include: { segments: { orderBy: { segmentOrder: "asc" } } },
  });
  if (!existing) throw new AdminServiceError("Flight not found.", "NOT_FOUND");
  const { airline, origin, destination, flightNumber } = await resolveRefs(input.data);
  const meta = buildMeta(input.data, input.data.isActive);
  const segment = segmentData(meta, origin, destination, input.data.aircraftCode);
  const key = inventoryMetaKey(existing.id);

  const updated = await prisma.$transaction(async (tx) => {
    const flight = await tx.flight.update({
      where: { id: existing.id },
      data: {
        airlineId: airline.id,
        flightNumber,
        cabinClass: input.data.cabinClass,
        providerCode: INVENTORY_SUPPLIER_CODE,
      },
    });
    const first = existing.segments[0];
    if (first) {
      await tx.flightSegment.update({ where: { id: first.id }, data: segment });
      // Inventory flights are single-segment (non-stop).
      await tx.flightSegment.deleteMany({
        where: { flightId: existing.id, id: { not: first.id } },
      });
    } else {
      await tx.flightSegment.create({ data: { ...segment, flightId: existing.id } });
    }
    await tx.siteSetting.upsert({
      where: { key },
      create: {
        key,
        label: `Inventory flight ${flightNumber} ${origin.iataCode}-${destination.iataCode}`,
        value: meta as unknown as Prisma.InputJsonValue,
      },
      update: {
        label: `Inventory flight ${flightNumber} ${origin.iataCode}-${destination.iataCode}`,
        value: meta as unknown as Prisma.InputJsonValue,
      },
    });
    return flight;
  });

  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_FLIGHT_UPDATE",
    entityType: "Flight",
    entityId: updated.id,
    metadata: {
      flightNumber,
      route: `${origin.iataCode}-${destination.iataCode}`,
      fare: meta.fare,
      seats: meta.seats,
      isActive: meta.isActive,
    },
  });
  return updated;
}

export async function setInventoryFlightActive(input: {
  actorId: string;
  id: string;
  isActive: boolean;
}) {
  await ensurePrisma();
  const meta = (await loadInventoryMeta([input.id])).get(input.id);
  if (!meta) {
    throw new AdminServiceError(
      "This flight has no fare/schedule yet. Use Edit to add one.",
      "VALIDATION",
    );
  }
  const next: InventoryFlightMeta = { ...meta, isActive: input.isActive };
  await prisma.siteSetting.update({
    where: { key: inventoryMetaKey(input.id) },
    data: { value: next as unknown as Prisma.InputJsonValue },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_FLIGHT_ACTIVE",
    entityType: "Flight",
    entityId: input.id,
    metadata: { isActive: input.isActive },
  });
  return { id: input.id, isActive: input.isActive };
}

/** Options for the admin flight form (active airlines and airports). */
export async function getInventoryFormOptions() {
  await ensurePrisma();
  const [airlines, airports] = await Promise.all([
    prisma.airline.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, iataCode: true, name: true },
    }),
    prisma.airport.findMany({
      where: { isActive: true },
      orderBy: { iataCode: "asc" },
      select: { iataCode: true, name: true, timezone: true },
    }),
  ]);
  return { airlines, airports };
}

export { loadInventoryMeta };

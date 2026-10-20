import { prisma } from "@/lib/db";
import { calculateAgencyMarkup } from "@/lib/booking/pricing";
import { addIsoDays, isoDateUTC } from "@/lib/flights/default-dates";
import { formatFlightNumber } from "@/lib/flights/flight-number";
import {
  INVENTORY_SUPPLIER_CODE,
  loadInventoryMeta,
  operatesOn,
} from "@/providers/flights/inventory-flight-supplier";

export type PublishedFareRow = {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  /** One published total for 1 adult, agency amount included. */
  totalPkr: number;
};

function nextOperatingDate(startDate: string, daysOfWeek: number[], endDate: string | null, from: string): string | null {
  const start = startDate > from ? startDate : from;
  for (let offset = 0; offset < 60; offset += 1) {
    const date = addIsoDays(start, offset);
    if (endDate && date > endDate) return null;
    if (
      operatesOn(
        {
          version: 1,
          isActive: true,
          fare: 0,
          taxes: 0,
          infantFare: 0,
          seats: 1,
          daysOfWeek,
          startDate,
          endDate,
          departureTime: "00:00",
          arrivalTime: "00:00",
          baggageKg: 0,
          refundable: false,
          fareNotes: null,
        },
        date,
      )
    ) {
      return date;
    }
  }
  return null;
}

/** Published inventory fares for one route. Empty when the database has no matching flight. */
export async function listPublishedRouteFares(
  origin: string,
  destination: string,
): Promise<PublishedFareRow[]> {
  const from = origin.trim().toUpperCase();
  const to = destination.trim().toUpperCase();
  if (from.length !== 3 || to.length !== 3 || from === to) return [];

  try {
    const flights = await prisma.flight.findMany({
      where: {
        providerCode: INVENTORY_SUPPLIER_CODE,
        status: { not: "CANCELLED" },
        airline: { isActive: true },
        segments: {
          some: {
            segmentOrder: 1,
            originAirport: { iataCode: from },
            destinationAirport: { iataCode: to },
          },
        },
      },
      include: {
        airline: true,
        segments: { orderBy: { segmentOrder: "asc" }, take: 1 },
      },
      take: 40,
    });
    const metas = await loadInventoryMeta(flights.map((flight) => flight.id));
    const today = isoDateUTC(0);
    const rows: PublishedFareRow[] = [];

    for (const flight of flights) {
      const meta = metas.get(flight.id);
      if (!meta?.isActive) continue;
      const date = nextOperatingDate(meta.startDate, meta.daysOfWeek, meta.endDate, today);
      if (!date) continue;
      const supplier = Math.round(meta.fare + meta.taxes);
      if (supplier <= 0) continue;
      const totalPkr = calculateAgencyMarkup(supplier, { seats: 1 }).customerTotal;
      rows.push({
        id: flight.id,
        airline: flight.airline.name,
        flightNumber: formatFlightNumber(flight.flightNumber, flight.airline.iataCode),
        origin: from,
        destination: to,
        date,
        departureTime: meta.departureTime,
        arrivalTime: meta.arrivalTime,
        totalPkr,
      });
    }

    return rows.sort((a, b) => a.totalPkr - b.totalPkr || a.departureTime.localeCompare(b.departureTime)).slice(0, 8);
  } catch {
    return [];
  }
}

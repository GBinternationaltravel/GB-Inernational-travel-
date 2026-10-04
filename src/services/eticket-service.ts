/**
 * Loads the printable e-ticket for a booking.
 * Access: the signed-in customer who owns the booking, or staff with bookings.view.
 * Reads only — never changes booking, ticket, or payment data.
 */

import { prisma } from "@/lib/db";
import { getBookingRepository } from "@/lib/booking/get-repository";
import { buildETicketView, type ETicketSourceTicket, type ETicketView } from "@/lib/booking/eticket";
import { hasPermission, isStaffRole } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { BookingServiceError } from "@/services/booking-service";

export type ETicketResult = ETicketView & { viewerIsStaff: boolean };

function canViewAsStaff(user: SessionUser): boolean {
  return isStaffRole(user.role) && hasPermission(user.role, "bookings.view");
}

async function loadIssuedTickets(
  bookingId: string,
): Promise<{ tickets: ETicketSourceTicket[]; confirmedAt: Date | null }> {
  try {
    const row = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        confirmedAt: true,
        tickets: {
          select: { ticketNumber: true, pnr: true, issuedAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return { tickets: row?.tickets ?? [], confirmedAt: row?.confirmedAt ?? null };
  } catch {
    // Local file store (no PostgreSQL): fall back to the booking's supplier reference.
    return { tickets: [], confirmedAt: null };
  }
}

/** Airport time zones from the Airport table (for "local time" hints abroad). */
async function loadAirportTimeZones(codes: string[]): Promise<Record<string, string | null>> {
  try {
    const rows = await prisma.airport.findMany({
      where: { iataCode: { in: codes.map((code) => code.toUpperCase()) } },
      select: { iataCode: true, timezone: true },
    });
    return Object.fromEntries(rows.map((row) => [row.iataCode.toUpperCase(), row.timezone]));
  } catch {
    return {};
  }
}

export async function getETicketForViewer(
  user: SessionUser,
  reference: string,
): Promise<ETicketResult> {
  const { repo, kind } = await getBookingRepository();
  const booking = await repo.findByReference(reference);
  const isOwner = Boolean(booking?.userId) && booking?.userId === user.id;
  const isStaff = canViewAsStaff(user);

  if (!booking || (!isOwner && !isStaff)) {
    throw new BookingServiceError(
      "We couldn't find this trip in your account.",
      "SESSION_NOT_FOUND",
    );
  }

  const offer = booking.offerSnapshot;
  const [issued, airportTimeZones] =
    kind === "prisma"
      ? await Promise.all([
          loadIssuedTickets(booking.id),
          loadAirportTimeZones([offer.origin, offer.destination].filter(Boolean)),
        ])
      : [{ tickets: [], confirmedAt: null }, {}];

  const view = buildETicketView({
    booking,
    tickets: issued.tickets,
    confirmedAt: issued.confirmedAt,
    airportTimeZones,
  });

  if (isStaff && !isOwner) {
    await writeAuditLog({
      userId: user.id,
      action: "ADMIN_ETICKET_VIEWED",
      entityType: "Booking",
      entityId: booking.reference,
      metadata: { store: kind, ticketed: view.ticketed },
    }).catch(() => {
      /* audit failure must not block viewing */
    });
  }

  return { ...view, viewerIsStaff: isStaff && !isOwner };
}

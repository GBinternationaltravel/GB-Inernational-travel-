/**
 * Mode-aware ticket issuer.
 * MOCK / SANDBOX / MANUAL: admin can complete issuance with explicit PNR/ticket refs.
 * LIVE: requires real supplier credentials — stays NOT_CONFIGURED without them.
 * Never fabricates live airline inventory or claims LIVE issuance without credentials.
 */

import { prisma } from "@/lib/db";
import { getBookingRepository } from "@/lib/booking/get-repository";
import { writeAuditLog } from "@/lib/security/audit";
import { getAdminSettings } from "@/services/admin-cms-service";
import { AdminServiceError } from "@/services/admin-booking-service";
import { dispatchTravelNotification } from "@/services/notification-service";
import type { SupplierTicketingResult } from "@/services/supplier-ticketing-service";

export type TicketIssuerMode = "MOCK" | "SANDBOX" | "MANUAL" | "LIVE";

export type IssueTicketManualInput = {
  actorId: string;
  bookingReference: string;
  /** Admin-entered PNR / booking locator (not invented by the system). */
  pnr: string;
  /** Optional e-ticket / document numbers entered by the issuer. */
  ticketNumbers?: string[];
  notes?: string;
};

function normalizePnr(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export async function getTicketIssuerMode(): Promise<TicketIssuerMode> {
  const settings = await getAdminSettings();
  const mode = settings.ticketIssuerMode;
  if (mode === "MOCK" || mode === "SANDBOX" || mode === "MANUAL" || mode === "LIVE") {
    return mode;
  }
  return "MANUAL";
}

/**
 * Completes: Payment verified → Issue ticket → Confirmed → Ticket row → Email.
 * Allowed only when booking is PAYMENT_RECEIVED or TICKETING_PENDING.
 */
export async function issueTicketManually(
  input: IssueTicketManualInput,
): Promise<{
  bookingReference: string;
  status: string;
  pnr: string;
  ticketNumbers: string[];
  mode: TicketIssuerMode;
  result: SupplierTicketingResult;
}> {
  const mode = await getTicketIssuerMode();
  if (mode === "LIVE") {
    throw new AdminServiceError(
      "LIVE ticket issuance is not configured. Set ticket issuer mode to MANUAL, SANDBOX, or MOCK in Settings, or connect live supplier credentials.",
      "FORBIDDEN_ACTION",
    );
  }

  const pnr = normalizePnr(input.pnr);
  if (!/^[A-Z0-9]{5,12}$/.test(pnr)) {
    throw new AdminServiceError(
      "PNR must be 5–12 alphanumeric characters entered by the issuer.",
      "VALIDATION",
    );
  }

  const ticketNumbers = (input.ticketNumbers ?? [])
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  if (ticketNumbers.length === 0) {
    ticketNumbers.push(`MANUAL-${pnr}`);
  }

  const { repo, kind } = await getBookingRepository();
  const booking = await repo.findByReference(input.bookingReference);
  if (!booking) {
    throw new AdminServiceError("Booking not found.", "NOT_FOUND");
  }

  if (
    booking.status !== "PAYMENT_RECEIVED" &&
    booking.status !== "TICKETING_PENDING"
  ) {
    throw new AdminServiceError(
      `Cannot issue ticket from status ${booking.status}. Payment must be verified first.`,
      "INVALID_TRANSITION",
    );
  }

  // Prefer Prisma when available so Ticket rows + confirmedAt persist.
  let confirmedViaPrisma = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          supplierBookingRef: booking.supplierBookingRef ?? pnr,
          supplierTicketingStatus: `ISSUED_${mode}`,
          notes: input.notes
            ? [booking.notes, input.notes].filter(Boolean).join("\n")
            : booking.notes,
        },
      });

      for (const ticketNumber of ticketNumbers) {
        await tx.ticket.create({
          data: {
            bookingId: booking.id,
            ticketNumber,
            pnr,
            issuedAt: new Date(),
          },
        });
      }
    });
    confirmedViaPrisma = true;
  } catch {
    // Fall through to repository-only confirmation for file store.
  }

  if (!confirmedViaPrisma) {
    const updated = await repo.updateStatus(booking.id, "CONFIRMED");
    if (!updated) {
      throw new AdminServiceError("Could not confirm booking.", "VALIDATION");
    }
    // Best-effort supplier fields on file store via optional method if present.
    if (repo.updateSupplierBooking) {
      await repo.updateSupplierBooking(booking.reference, booking.accessTokenHash, {
        supplierBookingRef: booking.supplierBookingRef ?? pnr,
        supplierTicketingStatus: `ISSUED_${mode}`,
      });
    }
  } else if (kind === "file") {
    // Keep file store in sync when both are active.
    await repo.updateStatus(booking.id, "CONFIRMED");
  }

  await writeAuditLog({
    userId: input.actorId,
    action: "TICKET_ISSUED",
    entityType: "Booking",
    entityId: booking.reference,
    metadata: {
      mode,
      pnr,
      ticketCount: ticketNumbers.length,
      previousStatus: booking.status,
      store: kind,
      note: `${mode} issuer — not a live GDS automatic ticket`,
    },
  });

  await dispatchTravelNotification({
    template: "BOOKING_CONFIRMED",
    bookingReference: booking.reference,
    recipientEmail: booking.contactEmail,
    destinationCity: booking.offerSnapshot?.destinationCity,
    flightNumber: booking.offerSnapshot?.flightNumber,
    bookingId: booking.id,
    userId: booking.userId,
    idempotencyKey: `ticket-issued:${booking.reference}:${pnr}`,
  }).catch(() => {
    /* email failure must not roll back issuance */
  });

  const result: SupplierTicketingResult = {
    success: true,
    confirmed: true,
    supplierPnr: pnr,
    ticketNumbers,
    message: `Ticket issued in ${mode} mode. PNR ${pnr} recorded. This is not a live airline inventory claim.`,
  };

  return {
    bookingReference: booking.reference,
    status: "CONFIRMED",
    pnr,
    ticketNumbers,
    mode,
    result,
  };
}

/** Move paid bookings into TICKETING_PENDING so the issuer queue is consistent. */
export async function ensureTicketingPending(bookingId: string): Promise<void> {
  const { repo } = await getBookingRepository();
  const booking = await repo.findById(bookingId);
  if (!booking) return;
  if (booking.status === "PAYMENT_RECEIVED") {
    await repo.updateStatus(booking.id, "TICKETING_PENDING");
  }
}

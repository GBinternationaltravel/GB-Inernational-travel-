import type { BookingStatus } from "@prisma/client";

/**
 * Centralized booking status transitions.
 * CONFIRMED is never granted by admin click — only via SupplierTicketingService.
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ["PENDING_PAYMENT", "CANCELLED", "EXPIRED"],
  PENDING_PAYMENT: ["PAYMENT_PROCESSING", "PAYMENT_RECEIVED", "CANCELLED", "EXPIRED", "FAILED"],
  PAYMENT_PROCESSING: ["PAYMENT_RECEIVED", "PENDING_PAYMENT", "FAILED", "CANCELLED"],
  PAYMENT_RECEIVED: ["TICKETING_PENDING", "CANCELLED", "REFUNDED"],
  TICKETING_PENDING: ["CANCELLED", "REFUNDED"],
  // CONFIRMED intentionally omitted from admin-allowed targets of TICKETING_PENDING
  CONFIRMED: ["CANCELLED", "REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
  FAILED: ["PENDING_PAYMENT", "CANCELLED", "EXPIRED"],
  EXPIRED: ["DRAFT", "CANCELLED"],
};

export function canTransitionBookingStatus(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  if (from === to) return false;
  return BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedBookingTransitions(from: BookingStatus): BookingStatus[] {
  return [...(BOOKING_TRANSITIONS[from] ?? [])];
}

export function assertBookingTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransitionBookingStatus(from, to)) {
    throw new Error(`Invalid booking status transition: ${from} → ${to}`);
  }
  if (to === "CONFIRMED") {
    throw new Error(
      "CONFIRMED requires authoritative supplier ticketing confirmation.",
    );
  }
}

/**
 * Legal steps from a paid booking toward TICKETING_PENDING.
 * Each hop is already in BOOKING_TRANSITIONS. Never includes CONFIRMED.
 */
export function bookingStepsToTicketingPending(status: BookingStatus): BookingStatus[] {
  if (status === "PENDING_PAYMENT" || status === "PAYMENT_PROCESSING") {
    return ["PAYMENT_RECEIVED", "TICKETING_PENDING"];
  }
  if (status === "PAYMENT_RECEIVED") {
    return ["TICKETING_PENDING"];
  }
  return [];
}

/** True when the booking is already TICKETING_PENDING or can legally walk there. */
export function canReachTicketingPendingFrom(status: BookingStatus): boolean {
  return status === "TICKETING_PENDING" || bookingStepsToTicketingPending(status).length > 0;
}

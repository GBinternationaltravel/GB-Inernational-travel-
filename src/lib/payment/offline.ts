import type { BookingStatus, UserRole } from "@prisma/client";
import { hasPermission } from "@/lib/auth/permissions";
import { bookingStepsToTicketingPending } from "@/lib/booking/status-transitions";
import type { StoredPayment } from "@/lib/payment/repository";

/**
 * Staff-selected offline methods. Prisma PaymentMethod has BANK_TRANSFER, WALLET,
 * OTHER and CARD — not CASH. Cash is stored as OTHER plus metadata.offlineMethod.
 */
export const OFFLINE_PAYMENT_METHODS = ["BANK_TRANSFER", "CASH", "WALLET"] as const;
export type OfflinePaymentMethod = (typeof OFFLINE_PAYMENT_METHODS)[number];

export const COUNTED_PAID_STATUSES = new Set(["PAID", "CAPTURED", "AUTHORIZED"]);
export const OPEN_CHECKOUT_STATUSES = new Set(["PENDING", "PROCESSING", "AUTHORIZED"]);

export const OFFLINE_RECORDABLE_BOOKING_STATUSES = new Set<BookingStatus>([
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "PAYMENT_RECEIVED",
  "TICKETING_PENDING",
]);

export function isOfflinePaymentMethod(value: string): value is OfflinePaymentMethod {
  return (OFFLINE_PAYMENT_METHODS as readonly string[]).includes(value);
}

export function toPrismaPaymentMethod(method: OfflinePaymentMethod): {
  method: "BANK_TRANSFER" | "WALLET" | "OTHER";
  offlineMethod: OfflinePaymentMethod;
} {
  if (method === "CASH") return { method: "OTHER", offlineMethod: "CASH" };
  return { method, offlineMethod: method };
}

export function offlinePaymentIdempotencyKey(bookingId: string): string {
  return `offline:${bookingId}`;
}

export function sumCountedPayments(payments: StoredPayment[]): number {
  return payments
    .filter((payment) => COUNTED_PAID_STATUSES.has(payment.status))
    .reduce((sum, payment) => sum + Math.round(payment.amount), 0);
}

export function outstandingBalance(expectedTotal: number, payments: StoredPayment[]): number {
  return Math.max(0, Math.round(expectedTotal) - sumCountedPayments(payments));
}

export function hasOpenCheckoutPayment(payments: StoredPayment[]): boolean {
  return payments.some((payment) => OPEN_CHECKOUT_STATUSES.has(payment.status));
}

export function canRecordOfflineAgainstStatus(status: BookingStatus): boolean {
  return OFFLINE_RECORDABLE_BOOKING_STATUSES.has(status);
}

export function canRecordOfflinePaymentRole(role: UserRole): boolean {
  return hasPermission(role, "payments.verify");
}

export function isPaymentFinalized(status: string): boolean {
  return status === "PAID" || status === "CAPTURED" || status === "REFUNDED";
}

/** Booking statuses from which a ticket may be issued. Payment recording never sets CONFIRMED. */
export function canIssueTicketFromStatus(status: string): boolean {
  return status === "PAYMENT_RECEIVED" || status === "TICKETING_PENDING";
}

export function ticketAlreadyIssued(
  status: string,
  supplierTicketingStatus?: string | null,
): boolean {
  return status === "CONFIRMED" || Boolean(supplierTicketingStatus?.startsWith("ISSUED_"));
}

/**
 * After a full offline payment, move toward TICKETING_PENDING using only
 * BOOKING_TRANSITIONS. Never skip to CONFIRMED.
 */
export function bookingStepsAfterFullOfflinePayment(
  status: BookingStatus,
): BookingStatus[] {
  return bookingStepsToTicketingPending(status);
}

export function roundPkrAmount(value: number): number {
  return Math.round(value);
}

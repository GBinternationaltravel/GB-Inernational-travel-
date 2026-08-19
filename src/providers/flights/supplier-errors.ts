/**
 * Normalized supplier error codes — never expose raw supplier payloads to customers.
 */

export type SupplierErrorCode =
  | "OFFER_EXPIRED"
  | "NO_AVAILABILITY"
  | "PRICE_CHANGED"
  | "SUPPLIER_TIMEOUT"
  | "SUPPLIER_UNAVAILABLE"
  | "INVALID_REQUEST"
  | "BOOKING_FAILED"
  | "TICKETING_FAILED"
  | "CANCELLATION_FAILED"
  | "UNSUPPORTED_OPERATION"
  | "NOT_CONFIGURED"
  | "NOT_SUPPORTED"
  | "IDEMPOTENCY_CONFLICT";

export class SupplierError extends Error {
  constructor(
    readonly code: SupplierErrorCode,
    message: string,
    readonly retryable = false,
    readonly details?: Record<string, string | number | boolean | null>,
  ) {
    super(message);
    this.name = "SupplierError";
  }
}

const customerMessages: Record<SupplierErrorCode, string> = {
  OFFER_EXPIRED: "This flight offer has expired. Please search again.",
  NO_AVAILABILITY: "No flights are available for this search right now.",
  PRICE_CHANGED: "The fare has changed. Please review the updated price.",
  SUPPLIER_TIMEOUT: "The flight supplier took too long to respond. Please try again.",
  SUPPLIER_UNAVAILABLE: "The flight supplier is temporarily unavailable.",
  INVALID_REQUEST: "We couldn't process that flight request. Please check your search.",
  BOOKING_FAILED: "We couldn't create a supplier booking right now.",
  TICKETING_FAILED: "Ticket issuance failed. Your payment status is unchanged.",
  CANCELLATION_FAILED: "We couldn't cancel this supplier booking right now.",
  UNSUPPORTED_OPERATION: "This operation is not supported by the flight supplier.",
  NOT_CONFIGURED: "A live flight supplier is not configured yet.",
  NOT_SUPPORTED: "This capability is not supported yet.",
  IDEMPOTENCY_CONFLICT: "This request was already processed. No duplicate was created.",
};

export function toCustomerSupplierMessage(error: unknown): string {
  if (error instanceof SupplierError) {
    return customerMessages[error.code] ?? "Something went wrong with the flight supplier.";
  }
  return "Something went wrong with the flight supplier.";
}

export function unsupportedResult(operation: string) {
  return {
    ok: false as const,
    code: "NOT_SUPPORTED" as const,
    message: `${operation} is not supported by the configured flight supplier.`,
  };
}

export function notConfiguredResult(operation: string) {
  return {
    ok: false as const,
    code: "NOT_CONFIGURED" as const,
    message: `${operation} requires a live flight supplier. Mock/development mode does not create real airline bookings.`,
  };
}

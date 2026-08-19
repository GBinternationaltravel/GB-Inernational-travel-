/**
 * Supplier ticketing — Phase 7A.
 * Returns NOT_CONFIGURED / NOT_SUPPORTED. Never invents PNRs or e-tickets.
 */

import { getFlightSupplier } from "@/providers/registry";
import { buildIdempotencyKey } from "@/providers/flights/idempotency";

export type SupplierTicketingRequest = {
  bookingReference: string;
  bookingId: string;
  supplierBookingId?: string | null;
  idempotencyKey?: string;
};

export type SupplierTicketingResult = {
  success: boolean;
  confirmed: boolean;
  code?: "NOT_CONFIGURED" | "NOT_SUPPORTED" | "TICKETING_FAILED";
  supplierPnr?: string;
  ticketNumbers?: string[];
  message: string;
};

export interface SupplierTicketingService {
  createBooking(input: {
    idempotencyKey: string;
    bookingReference: string;
    bookingId: string;
  }): Promise<SupplierTicketingResult>;

  issueTicket(input: SupplierTicketingRequest): Promise<SupplierTicketingResult>;

  getBooking(input: {
    supplierBookingId: string;
  }): Promise<SupplierTicketingResult>;

  getTicketStatus(input: {
    supplierBookingId: string;
  }): Promise<SupplierTicketingResult>;

  cancelBooking(input: {
    idempotencyKey: string;
    supplierBookingId: string;
  }): Promise<SupplierTicketingResult>;

  /** @deprecated Prefer issueTicket — retained for Phase 6 admin callers */
  requestTicketing(input: SupplierTicketingRequest): Promise<SupplierTicketingResult>;

  applySupplierConfirmation(input: {
    bookingReference: string;
    supplierPnr: string;
    ticketNumbers: string[];
  }): Promise<SupplierTicketingResult>;
}

export class NotConfiguredSupplierTicketingService implements SupplierTicketingService {
  async createBooking(): Promise<SupplierTicketingResult> {
    return {
      success: false,
      confirmed: false,
      code: "NOT_CONFIGURED",
      message:
        "Supplier booking is not configured. Mock mode does not create airline PNRs.",
    };
  }

  async issueTicket(input: SupplierTicketingRequest): Promise<SupplierTicketingResult> {
    const supplier = getFlightSupplier();
    const result = await supplier.issueTicket({
      idempotencyKey:
        input.idempotencyKey ??
        buildIdempotencyKey(["ticket", input.bookingReference, input.bookingId]),
      bookingReference: input.bookingReference,
      bookingId: input.bookingId,
      supplierBookingId: input.supplierBookingId,
    });

    if (result.ok) {
      return {
        success: true,
        confirmed: true,
        supplierPnr: result.supplierPnr,
        ticketNumbers: result.ticketNumbers,
        message: result.message,
      };
    }

    return {
      success: false,
      confirmed: false,
      code: result.code,
      message: result.message,
    };
  }

  async getBooking(): Promise<SupplierTicketingResult> {
    return {
      success: false,
      confirmed: false,
      code: "NOT_CONFIGURED",
      message: "Supplier booking lookup is not configured.",
    };
  }

  async getTicketStatus(): Promise<SupplierTicketingResult> {
    return {
      success: false,
      confirmed: false,
      code: "NOT_CONFIGURED",
      message: "Ticket status is unavailable until a live supplier is connected.",
    };
  }

  async cancelBooking(): Promise<SupplierTicketingResult> {
    return {
      success: false,
      confirmed: false,
      code: "NOT_SUPPORTED",
      message: "Supplier cancellation is not supported yet.",
    };
  }

  async requestTicketing(input: SupplierTicketingRequest): Promise<SupplierTicketingResult> {
    return this.issueTicket(input);
  }

  async applySupplierConfirmation(input: {
    bookingReference: string;
    supplierPnr: string;
    ticketNumbers: string[];
  }): Promise<SupplierTicketingResult> {
    // Delegates to mode-aware issuer. Requires an actor context — use issueTicketManually from admin API.
    void input;
    return {
      success: false,
      confirmed: false,
      code: "NOT_CONFIGURED",
      message:
        "Use the admin Issue Ticket action (MANUAL/SANDBOX/MOCK). LIVE automatic confirmation is not configured.",
    };
  }
}

let ticketingService: SupplierTicketingService | null = null;

export function getSupplierTicketingService(): SupplierTicketingService {
  if (!ticketingService) {
    ticketingService = new NotConfiguredSupplierTicketingService();
  }
  return ticketingService;
}

export function setSupplierTicketingService(service: SupplierTicketingService): void {
  ticketingService = service;
}

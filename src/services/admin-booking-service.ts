import type { BookingStatus } from "@prisma/client";
import { ADMIN_PAGE_SIZE } from "@/config/admin";
import { getBookingRepository } from "@/lib/booking/get-repository";
import type { StoredBooking } from "@/lib/booking/repository";
import { maskPassport } from "@/lib/booking/masking";
import {
  allowedBookingTransitions,
  assertBookingTransition,
} from "@/lib/booking/status-transitions";
import { getPaymentRepository } from "@/lib/payment/get-repository";
import type { StoredPayment } from "@/lib/payment/repository";
import { getUserRepository } from "@/lib/auth/get-user-repository";
import { writeAuditLog } from "@/lib/security/audit";
import { isProductionAdminStoreRequired } from "@/lib/auth/admin";
import { getSupplierTicketingService } from "@/services/supplier-ticketing-service";
import { dispatchTravelNotification } from "@/services/notification-service";

export class AdminServiceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "VALIDATION"
      | "INVALID_TRANSITION"
      | "FORBIDDEN_ACTION"
      | "STORE",
  ) {
    super(message);
    this.name = "AdminServiceError";
  }
}

export type AdminStoreMeta = {
  store: "prisma" | "file";
  developmentDataStore: boolean;
};

export type AdminBookingListItem = {
  reference: string;
  customerEmail: string;
  customerName: string;
  route: string;
  travelDate: string | null;
  amount: number;
  currency: string;
  bookingStatus: string;
  paymentStatus: string;
  createdAt: string;
};

export type AdminBookingDetail = {
  reference: string;
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  currency: string;
  totalAmount: number;
  subtotalAmount: number;
  taxesAmount: number;
  feesAmount: number;
  supplierFare: number;
  markupRate: number | null;
  pricingNotice: string | null;
  contactEmail: string;
  contactPhone: string;
  customer: {
    id: string | null;
    name: string;
    email: string;
    phone: string;
  };
  flight: {
    origin: string;
    destination: string;
    originCity: string;
    destinationCity: string;
    departureAt: string;
    arrivalAt: string;
    airlineName: string;
    flightNumber: string;
    cabinClass: string;
    baggageKg: number;
    stops: number;
  };
  passengers: Array<{
    id: string;
    name: string;
    type: string;
    nationality: string;
    passportMasked: string;
  }>;
  payments: Array<{
    id: string;
    status: string;
    provider: string | null;
    providerRef: string | null;
    amount: number;
    currency: string;
    isMock: boolean;
    failureReason: string | null;
    createdAt: string;
    updatedAt: string;
    paidAt: string | null;
    attempts: Array<{
      id: string;
      attemptNumber: number;
      status: string;
      provider: string;
      providerCheckoutId: string | null;
      createdAt: string;
      completedAt: string | null;
      errorMessage: string | null;
    }>;
    events: Array<{
      id: string;
      eventType: string;
      signatureValid: boolean;
      processed: boolean;
      processingResult: string | null;
      createdAt: string;
    }>;
  }>;
  allowedTransitions: BookingStatus[];
  ticketingNote: string;
  supplier: {
    supplierCode: string | null;
    supplierOfferId: string | null;
    supplierBookingRef: string | null;
    supplierBookingStatus: string | null;
    supplierTicketingStatus: string | null;
    offerExpiresAt: string | null;
    message: string;
  };
};

function paymentStatusForBooking(
  booking: StoredBooking,
  payments: StoredPayment[],
): string {
  const latest = payments
    .filter((payment) => payment.bookingId === booking.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (latest) return latest.status;
  if (booking.status === "PENDING_PAYMENT") return "PENDING";
  if (booking.status === "PAYMENT_RECEIVED" || booking.status === "TICKETING_PENDING") {
    return "PAID";
  }
  return "—";
}

function customerNameFromBooking(
  booking: StoredBooking,
  users: Map<string, { firstName: string | null; lastName: string | null; email: string }>,
): string {
  if (booking.userId && users.has(booking.userId)) {
    const user = users.get(booking.userId)!;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || user.email;
  }
  const lead = booking.passengers[0];
  if (lead) return `${lead.firstName} ${lead.lastName}`.trim();
  return booking.contactEmail;
}

async function loadContext() {
  const bookingStore = await getBookingRepository();
  const paymentStore = await getPaymentRepository();
  const userStore = await getUserRepository();

  if (isProductionAdminStoreRequired(bookingStore.kind)) {
    throw new AdminServiceError(
      "Production admin requires PostgreSQL.",
      "STORE",
    );
  }

  const [bookings, payments, users] = await Promise.all([
    bookingStore.repo.listAll(),
    paymentStore.repo.listAll(),
    userStore.repo.listAll(),
  ]);

  const userMap = new Map(
    users.map((user) => [
      user.id,
      {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        phoneCountryCode: user.phoneCountryCode,
      },
    ]),
  );

  return {
    bookings,
    payments,
    userMap,
    store: bookingStore.kind,
    developmentDataStore: bookingStore.kind === "file",
  };
}

function toListItem(
  booking: StoredBooking,
  payments: StoredPayment[],
  userMap: Map<string, { firstName: string | null; lastName: string | null; email: string }>,
): AdminBookingListItem {
  const offer = booking.offerSnapshot;
  return {
    reference: booking.reference,
    customerEmail: booking.contactEmail,
    customerName: customerNameFromBooking(booking, userMap),
    route: offer
      ? `${offer.originCity} → ${offer.destinationCity}`
      : "—",
    travelDate: offer?.departureAt ?? null,
    amount: booking.totalAmount,
    currency: booking.currency,
    bookingStatus: booking.status,
    paymentStatus: paymentStatusForBooking(booking, payments),
    createdAt: booking.createdAt,
  };
}

export type AdminBookingQuery = {
  page?: number;
  pageSize?: number;
  query?: string;
  bookingStatus?: string;
  paymentStatus?: string;
  travelFrom?: string;
  travelTo?: string;
  createdFrom?: string;
  createdTo?: string;
  sort?: "created_desc" | "created_asc" | "travel_asc" | "travel_desc" | "amount_desc";
};

export async function getAdminDashboard(actorId: string) {
  const ctx = await loadContext();
  const { repo: userRepo } = await getUserRepository();
  const users = await userRepo.listAll();
  const customerCount = users.filter((user) => user.role === "CUSTOMER").length;

  const metrics = {
    totalBookings: ctx.bookings.length,
    paymentReceived: ctx.bookings.filter((b) => b.status === "PAYMENT_RECEIVED").length,
    pendingPayment: ctx.bookings.filter((b) => b.status === "PENDING_PAYMENT").length,
    ticketingPending: ctx.bookings.filter((b) => b.status === "TICKETING_PENDING").length,
    cancelled: ctx.bookings.filter((b) => b.status === "CANCELLED").length,
    customers: customerCount,
  };

  const recentBookings = ctx.bookings
    .slice(0, 8)
    .map((booking) => toListItem(booking, ctx.payments, ctx.userMap));

  const requiresAttention = {
    paymentPending: ctx.bookings.filter((b) => b.status === "PENDING_PAYMENT").length,
    paymentReceivedOrTicketing: ctx.bookings.filter(
      (b) => b.status === "PAYMENT_RECEIVED" || b.status === "TICKETING_PENDING",
    ).length,
    failedPayments: ctx.payments.filter((p) => p.status === "FAILED").length,
    expiredBookings: ctx.bookings.filter((b) => b.status === "EXPIRED").length,
    cancelledBookings: ctx.bookings.filter((b) => b.status === "CANCELLED").length,
  };

  await writeAuditLog({
    userId: actorId,
    action: "ADMIN_DASHBOARD_VIEWED",
    entityType: "Admin",
    entityId: "dashboard",
    metadata: { store: ctx.store },
  });

  return {
    store: ctx.store,
    developmentDataStore: ctx.developmentDataStore,
    metrics,
    recentBookings,
    requiresAttention,
  };
}

export async function listAdminBookings(
  actorId: string,
  rawQuery: AdminBookingQuery,
) {
  const ctx = await loadContext();
  const page = Math.max(1, rawQuery.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, rawQuery.pageSize ?? ADMIN_PAGE_SIZE));
  const q = (rawQuery.query ?? "").trim().toLowerCase();

  let rows = ctx.bookings.map((booking) =>
    toListItem(booking, ctx.payments, ctx.userMap),
  );

  if (q) {
    rows = rows.filter((row) => {
      const booking = ctx.bookings.find((b) => b.reference === row.reference);
      const passengerHit = booking?.passengers.some((p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q),
      );
      return (
        row.reference.toLowerCase().includes(q) ||
        row.customerEmail.toLowerCase().includes(q) ||
        row.customerName.toLowerCase().includes(q) ||
        Boolean(passengerHit)
      );
    });
  }

  if (rawQuery.bookingStatus) {
    rows = rows.filter((row) => row.bookingStatus === rawQuery.bookingStatus);
  }
  if (rawQuery.paymentStatus) {
    rows = rows.filter((row) => row.paymentStatus === rawQuery.paymentStatus);
  }
  if (rawQuery.travelFrom) {
    rows = rows.filter(
      (row) => row.travelDate && row.travelDate.slice(0, 10) >= rawQuery.travelFrom!,
    );
  }
  if (rawQuery.travelTo) {
    rows = rows.filter(
      (row) => row.travelDate && row.travelDate.slice(0, 10) <= rawQuery.travelTo!,
    );
  }
  if (rawQuery.createdFrom) {
    rows = rows.filter((row) => row.createdAt.slice(0, 10) >= rawQuery.createdFrom!);
  }
  if (rawQuery.createdTo) {
    rows = rows.filter((row) => row.createdAt.slice(0, 10) <= rawQuery.createdTo!);
  }

  const sort = rawQuery.sort ?? "created_desc";
  rows.sort((a, b) => {
    switch (sort) {
      case "created_asc":
        return a.createdAt.localeCompare(b.createdAt);
      case "travel_asc":
        return (a.travelDate ?? "").localeCompare(b.travelDate ?? "");
      case "travel_desc":
        return (b.travelDate ?? "").localeCompare(a.travelDate ?? "");
      case "amount_desc":
        return b.amount - a.amount;
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);

  await writeAuditLog({
    userId: actorId,
    action: "ADMIN_BOOKINGS_LISTED",
    entityType: "Booking",
    metadata: { query: q || null, page, total, store: ctx.store },
  });

  return {
    store: ctx.store,
    developmentDataStore: ctx.developmentDataStore,
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminBookingDetail(
  actorId: string,
  reference: string,
): Promise<AdminBookingDetail & AdminStoreMeta> {
  const ctx = await loadContext();
  const booking = ctx.bookings.find((item) => item.reference === reference);
  if (!booking) {
    throw new AdminServiceError("Booking not found.", "NOT_FOUND");
  }

  const offer = booking.offerSnapshot;
  const user = booking.userId ? ctx.userMap.get(booking.userId) : null;
  const payments = ctx.payments.filter((payment) => payment.bookingId === booking.id);

  await writeAuditLog({
    userId: actorId,
    action: "ADMIN_BOOKING_VIEWED",
    entityType: "Booking",
    entityId: booking.reference,
    metadata: { store: ctx.store },
  });

  return {
    store: ctx.store,
    developmentDataStore: ctx.developmentDataStore,
    reference: booking.reference,
    id: booking.id,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    currency: booking.currency,
    totalAmount: booking.totalAmount,
    subtotalAmount: booking.subtotalAmount,
    taxesAmount: booking.taxesAmount,
    feesAmount: booking.feesAmount,
    supplierFare:
      offer?.pricing?.supplierFare ??
      booking.subtotalAmount + booking.taxesAmount,
    markupRate: offer?.pricing?.markupRate ?? null,
    pricingNotice: offer?.pricing?.notice ?? null,
    contactEmail: booking.contactEmail,
    contactPhone: `${booking.contactPhoneCountry} ${booking.contactPhone}`.trim(),
    customer: {
      id: booking.userId ?? null,
      name: customerNameFromBooking(booking, ctx.userMap),
      email: user?.email ?? booking.contactEmail,
      phone: user
        ? `${user.phoneCountryCode ?? ""} ${user.phone ?? ""}`.trim()
        : `${booking.contactPhoneCountry} ${booking.contactPhone}`.trim(),
    },
    flight: {
      origin: offer?.origin ?? "",
      destination: offer?.destination ?? "",
      originCity: offer?.originCity ?? "",
      destinationCity: offer?.destinationCity ?? "",
      departureAt: offer?.departureAt ?? "",
      arrivalAt: offer?.arrivalAt ?? "",
      airlineName: offer?.airlineName ?? "",
      flightNumber: offer?.flightNumber ?? "",
      cabinClass: offer?.cabinClass ?? booking.cabinClass,
      baggageKg: offer?.baggageKg ?? 0,
      stops: offer?.stops ?? 0,
    },
    passengers: booking.passengers.map((passenger) => ({
      id: passenger.id,
      name: `${passenger.firstName}${passenger.middleName ? ` ${passenger.middleName}` : ""} ${passenger.lastName}`.trim(),
      type: passenger.passengerType,
      nationality: passenger.nationality,
      passportMasked: maskPassport(passenger.passportNumber),
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      status: payment.status,
      provider: payment.provider ?? null,
      providerRef: payment.providerRef ?? null,
      amount: payment.amount,
      currency: payment.currency,
      isMock: payment.isMock,
      failureReason: payment.failureReason ?? null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      paidAt: payment.paidAt ?? null,
      attempts: payment.attempts.map((attempt) => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        provider: attempt.provider,
        providerCheckoutId: attempt.providerCheckoutId ?? null,
        createdAt: attempt.createdAt,
        completedAt: attempt.completedAt ?? null,
        errorMessage: attempt.errorMessage ?? null,
      })),
      events: payment.events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        signatureValid: event.signatureValid,
        processed: event.processed,
        processingResult: event.processingResult ?? null,
        createdAt: event.createdAt,
      })),
    })),
    allowedTransitions: allowedBookingTransitions(booking.status),
    ticketingNote:
      booking.status === "TICKETING_PENDING"
        ? "Awaiting authoritative supplier ticketing. Admin cannot confirm tickets or invent PNRs."
        : "Ticket confirmation requires SupplierTicketingService after live airline integration.",
    supplier: {
      supplierCode: booking.supplierCode ?? booking.offerSnapshot.supplierCode ?? null,
      supplierOfferId:
        booking.supplierOfferId ?? booking.offerSnapshot.supplierOfferId ?? null,
      supplierBookingRef: booking.supplierBookingRef ?? null,
      supplierBookingStatus: booking.supplierBookingStatus ?? null,
      supplierTicketingStatus: booking.supplierTicketingStatus ?? null,
      offerExpiresAt:
        booking.offerExpiresAt ?? booking.offerSnapshot.expiresAt ?? null,
      message: booking.supplierBookingRef
        ? "Supplier booking reference is present."
        : "Supplier booking not created.",
    },
  };
}

export async function transitionAdminBookingStatus(input: {
  actorId: string;
  reference: string;
  toStatus: BookingStatus;
}): Promise<{ reference: string; status: string }> {
  const { repo, kind } = await getBookingRepository();
  if (isProductionAdminStoreRequired(kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const booking = await repo.findByReference(input.reference);
  if (!booking) {
    throw new AdminServiceError("Booking not found.", "NOT_FOUND");
  }

  if (input.toStatus === "CONFIRMED") {
    const ticketing = getSupplierTicketingService();
    const result = await ticketing.requestTicketing({
      bookingReference: booking.reference,
      bookingId: booking.id,
    });
    throw new AdminServiceError(
      result.message ||
        "Cannot mark CONFIRMED without supplier ticketing confirmation.",
      "FORBIDDEN_ACTION",
    );
  }

  try {
    assertBookingTransition(booking.status, input.toStatus);
  } catch (error) {
    throw new AdminServiceError(
      error instanceof Error ? error.message : "Invalid status transition.",
      "INVALID_TRANSITION",
    );
  }

  const updated = await repo.updateStatus(booking.id, input.toStatus);
  if (!updated) {
    throw new AdminServiceError("Could not update booking status.", "VALIDATION");
  }

  await writeAuditLog({
    userId: input.actorId,
    action: "ADMIN_BOOKING_STATUS_CHANGED",
    entityType: "Booking",
    entityId: booking.reference,
    metadata: {
      from: booking.status,
      to: input.toStatus,
      store: kind,
    },
  });

  if (input.toStatus === "CANCELLED") {
    await dispatchTravelNotification({
      template: "BOOKING_CANCELLED",
      bookingReference: booking.reference,
      recipientEmail: booking.contactEmail,
      destinationCity: booking.offerSnapshot?.destinationCity,
      flightNumber: booking.offerSnapshot?.flightNumber,
      bookingId: booking.id,
      userId: booking.userId,
      idempotencyKey: `booking-cancelled:${booking.reference}`,
    }).catch(() => undefined);
  }

  return { reference: updated.reference, status: updated.status };
}

/** Convenience export name expected by architecture brief */
export const AdminBookingService = {
  list: listAdminBookings,
  get: getAdminBookingDetail,
  transition: transitionAdminBookingStatus,
  dashboard: getAdminDashboard,
};

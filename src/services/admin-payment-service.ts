import { ADMIN_PAGE_SIZE } from "@/config/admin";
import { isProductionAdminStoreRequired } from "@/lib/auth/admin";
import { getBookingRepository } from "@/lib/booking/get-repository";
import { assertBookingTransition } from "@/lib/booking/status-transitions";
import { getPaymentRepository } from "@/lib/payment/get-repository";
import { getUserRepository } from "@/lib/auth/get-user-repository";
import { writeAuditLog } from "@/lib/security/audit";
import { AdminServiceError } from "@/services/admin-booking-service";

export type AdminPaymentListItem = {
  id: string;
  bookingReference: string;
  customer: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  isMock: boolean;
};

export async function listAdminPayments(
  actorId: string,
  input: {
    page?: number;
    pageSize?: number;
    query?: string;
    status?: string;
  },
) {
  const paymentStore = await getPaymentRepository();
  const bookingStore = await getBookingRepository();
  const userStore = await getUserRepository();
  if (isProductionAdminStoreRequired(paymentStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const [payments, bookings, users] = await Promise.all([
    paymentStore.repo.listAll(),
    bookingStore.repo.listAll(),
    userStore.repo.listAll(),
  ]);

  const bookingMap = new Map(bookings.map((booking) => [booking.id, booking]));
  const userMap = new Map(users.map((user) => [user.id, user]));

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? ADMIN_PAGE_SIZE));
  const q = (input.query ?? "").trim().toLowerCase();

  let rows: AdminPaymentListItem[] = payments.map((payment) => {
    const booking = bookingMap.get(payment.bookingId);
    const user = booking?.userId ? userMap.get(booking.userId) : null;
    const customer =
      (user && [user.firstName, user.lastName].filter(Boolean).join(" ")) ||
      booking?.contactEmail ||
      "—";
    return {
      id: payment.id,
      bookingReference: booking?.reference ?? "—",
      customer,
      provider: payment.provider ?? "—",
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      isMock: payment.isMock,
    };
  });

  if (q) {
    rows = rows.filter(
      (row) =>
        row.id.toLowerCase().includes(q) ||
        row.bookingReference.toLowerCase().includes(q) ||
        row.customer.toLowerCase().includes(q) ||
        row.provider.toLowerCase().includes(q),
    );
  }

  if (input.status) {
    rows = rows.filter((row) => row.status === input.status);
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);

  await writeAuditLog({
    userId: actorId,
    action: "ADMIN_PAYMENTS_LISTED",
    entityType: "Payment",
    metadata: { query: q || null, page, total, store: paymentStore.kind },
  });

  return {
    store: paymentStore.kind,
    developmentDataStore: paymentStore.kind === "file",
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminPaymentDetail(actorId: string, id: string) {
  const paymentStore = await getPaymentRepository();
  const bookingStore = await getBookingRepository();
  if (isProductionAdminStoreRequired(paymentStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const payment = await paymentStore.repo.findById(id);
  if (!payment || payment.id === "orphan-events") {
    throw new AdminServiceError("Payment not found.", "NOT_FOUND");
  }

  const booking = await bookingStore.repo.findById(payment.bookingId);

  await writeAuditLog({
    userId: actorId,
    action: "ADMIN_PAYMENT_VIEWED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { store: paymentStore.kind },
  });

  const timeline = [
    {
      at: payment.createdAt,
      label: "Payment created",
      detail: `${payment.status}`,
    },
    ...payment.attempts.map((attempt) => ({
      at: attempt.createdAt,
      label: `Attempt #${attempt.attemptNumber}`,
      detail: `${attempt.status}${attempt.errorMessage ? ` — ${attempt.errorMessage}` : ""}`,
    })),
    ...payment.events.map((event) => ({
      at: event.createdAt,
      label: event.eventType,
      detail: `signature=${event.signatureValid ? "valid" : "invalid"}; processed=${event.processed}`,
    })),
    ...(payment.paidAt
      ? [{ at: payment.paidAt, label: "Marked PAID", detail: "Verified payment success" }]
      : []),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return {
    store: paymentStore.kind,
    developmentDataStore: paymentStore.kind === "file",
    id: payment.id,
    status: payment.status,
    bookingReference: booking?.reference ?? null,
    provider: payment.provider,
    providerRef: payment.providerRef,
    amount: payment.amount,
    currency: payment.currency,
    isMock: payment.isMock,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    paidAt: payment.paidAt,
    attempts: payment.attempts.map((attempt) => ({
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      provider: attempt.provider,
      providerCheckoutId: attempt.providerCheckoutId,
      createdAt: attempt.createdAt,
      completedAt: attempt.completedAt,
      errorMessage: attempt.errorMessage,
    })),
    events: payment.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      signatureValid: event.signatureValid,
      processed: event.processed,
      processingResult: event.processingResult,
      createdAt: event.createdAt,
    })),
    timeline,
    refundNote:
      "Use Record refund to store a refund reference. Live PSP refunds require production payment credentials.",
    canVerify: ["PENDING", "PROCESSING", "AUTHORIZED", "FAILED"].includes(payment.status),
    canRefund: ["PAID", "CAPTURED"].includes(payment.status),
  };
}

export async function verifyAdminPayment(input: {
  actorId: string;
  paymentId: string;
  providerRef: string;
  note?: string;
}) {
  const paymentStore = await getPaymentRepository();
  const bookingStore = await getBookingRepository();
  if (isProductionAdminStoreRequired(paymentStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const payment = await paymentStore.repo.findById(input.paymentId);
  if (!payment) throw new AdminServiceError("Payment not found.", "NOT_FOUND");
  if (["PAID", "CAPTURED", "REFUNDED"].includes(payment.status)) {
    throw new AdminServiceError("Payment is already finalized.", "VALIDATION");
  }

  const booking = await bookingStore.repo.findById(payment.bookingId);
  if (!booking) throw new AdminServiceError("Booking not found.", "NOT_FOUND");

  const providerRef = input.providerRef.trim();
  if (providerRef.length < 4) {
    throw new AdminServiceError("Transaction reference is required.", "VALIDATION");
  }

  await paymentStore.repo.updatePayment(payment.id, {
    status: "PAID",
    providerRef,
    paidAt: new Date().toISOString(),
    failureReason: null,
    metadata: {
      ...(payment.metadata ?? {}),
      adminVerified: true,
      adminNote: input.note ?? null,
      verifiedBy: input.actorId,
    },
  });

  if (
    booking.status === "PENDING_PAYMENT" ||
    booking.status === "PAYMENT_PROCESSING" ||
    booking.status === "PAYMENT_RECEIVED"
  ) {
    await bookingStore.repo.updateStatus(booking.id, "TICKETING_PENDING");
  }

  await writeAuditLog({
    userId: input.actorId,
    action: "PAYMENT_VERIFIED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: {
      bookingReference: booking.reference,
      providerRef,
      amount: payment.amount,
      currency: payment.currency,
    },
  });

  return { id: payment.id, status: "PAID", bookingReference: booking.reference };
}

export async function recordAdminPaymentRefund(input: {
  actorId: string;
  paymentId: string;
  refundReference: string;
  reason?: string;
}) {
  const paymentStore = await getPaymentRepository();
  const bookingStore = await getBookingRepository();
  if (isProductionAdminStoreRequired(paymentStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const payment = await paymentStore.repo.findById(input.paymentId);
  if (!payment) throw new AdminServiceError("Payment not found.", "NOT_FOUND");
  if (!["PAID", "CAPTURED"].includes(payment.status)) {
    throw new AdminServiceError("Only paid payments can be refunded.", "VALIDATION");
  }

  const refundReference = input.refundReference.trim();
  if (refundReference.length < 4) {
    throw new AdminServiceError("Refund reference is required.", "VALIDATION");
  }

  const booking = await bookingStore.repo.findById(payment.bookingId);

  await paymentStore.repo.updatePayment(payment.id, {
    status: "REFUNDED",
    metadata: {
      ...(payment.metadata ?? {}),
      refundReference,
      refundReason: input.reason ?? null,
      refundRecordedBy: input.actorId,
      refundRecordedAt: new Date().toISOString(),
    },
  });

  if (
    booking &&
    (booking.status === "PAYMENT_RECEIVED" ||
      booking.status === "TICKETING_PENDING" ||
      booking.status === "CONFIRMED" ||
      booking.status === "CANCELLED")
  ) {
    try {
      assertBookingTransition(booking.status, "REFUNDED");
      await bookingStore.repo.updateStatus(booking.id, "REFUNDED");
    } catch {
      // If transition blocked, keep booking status but payment is refunded.
    }
  }

  await writeAuditLog({
    userId: input.actorId,
    action: "PAYMENT_REFUND_RECORDED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: {
      bookingReference: booking?.reference ?? null,
      refundReference,
      amount: payment.amount,
      currency: payment.currency,
    },
  });

  return {
    id: payment.id,
    status: "REFUNDED",
    refundReference,
    bookingReference: booking?.reference ?? null,
  };
}

export async function listAdminPassengers(
  actorId: string,
  input: { page?: number; pageSize?: number; query?: string },
) {
  const bookingStore = await getBookingRepository();
  if (isProductionAdminStoreRequired(bookingStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const bookings = await bookingStore.repo.listAll();
  const q = (input.query ?? "").trim().toLowerCase();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? ADMIN_PAGE_SIZE));

  let rows = bookings.flatMap((booking) =>
    booking.passengers.map((passenger) => ({
      id: passenger.id,
      name: `${passenger.firstName} ${passenger.lastName}`.trim(),
      type: passenger.passengerType,
      nationality: passenger.nationality,
      bookingReference: booking.reference,
      // Minimal exposure — no passport numbers on list
    })),
  );

  if (q) {
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.bookingReference.toLowerCase().includes(q) ||
        row.nationality.toLowerCase().includes(q),
    );
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;

  await writeAuditLog({
    userId: actorId,
    action: "ADMIN_PASSENGERS_LISTED",
    entityType: "Passenger",
    metadata: { query: q || null, page, total, store: bookingStore.kind },
  });

  return {
    store: bookingStore.kind,
    developmentDataStore: bookingStore.kind === "file",
    items: rows.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export const AdminPaymentService = {
  list: listAdminPayments,
  get: getAdminPaymentDetail,
  verify: verifyAdminPayment,
  refund: recordAdminPaymentRefund,
};

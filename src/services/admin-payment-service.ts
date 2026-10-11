import { Prisma, type UserRole } from "@prisma/client";
import { ADMIN_PAGE_SIZE } from "@/config/admin";
import { isProductionAdminStoreRequired } from "@/lib/auth/admin";
import { getBookingRepository } from "@/lib/booking/get-repository";
import {
  assertBookingTransition,
  bookingStepsToTicketingPending,
  canReachTicketingPendingFrom,
} from "@/lib/booking/status-transitions";
import { prisma } from "@/lib/db";
import { getPaymentRepository } from "@/lib/payment/get-repository";
import { getUserRepository } from "@/lib/auth/get-user-repository";
import { writeAuditLog } from "@/lib/security/audit";
import { AdminServiceError } from "@/services/admin-booking-service";
import type { BookingRepository } from "@/lib/booking/repository";
import type { PaymentRepository, StoredPayment } from "@/lib/payment/repository";
import {
  bookingStepsAfterFullOfflinePayment,
  canRecordOfflineAgainstStatus,
  canRecordOfflinePaymentRole,
  hasOpenCheckoutPayment,
  isOfflinePaymentMethod,
  offlinePaymentIdempotencyKey,
  outstandingBalance,
  roundPkrAmount,
  toPrismaPaymentMethod,
} from "@/lib/payment/offline";

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

export type OfflinePaymentDeps = {
  bookingRepo: BookingRepository;
  paymentRepo: PaymentRepository;
  writeAudit: typeof writeAuditLog;
};

export async function verifyAdminPayment(
  input: {
    actorId: string;
    paymentId: string;
    providerRef: string;
    note?: string;
  },
  deps?: OfflinePaymentDeps,
) {
  const paymentStore = deps
    ? { repo: deps.paymentRepo, kind: "file" as const }
    : await getPaymentRepository();
  const bookingStore = deps
    ? { repo: deps.bookingRepo, kind: "file" as const }
    : await getBookingRepository();
  const writeAudit = deps?.writeAudit ?? writeAuditLog;
  if (!deps && isProductionAdminStoreRequired(paymentStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const payment = await paymentStore.repo.findById(input.paymentId);
  if (!payment) throw new AdminServiceError("Payment not found.", "NOT_FOUND");
  if (["PAID", "CAPTURED", "REFUNDED"].includes(payment.status)) {
    throw new AdminServiceError("Payment is already finalized.", "VALIDATION");
  }

  const booking = await bookingStore.repo.findById(payment.bookingId);
  if (!booking) throw new AdminServiceError("Booking not found.", "NOT_FOUND");

  if (!canReachTicketingPendingFrom(booking.status)) {
    throw new AdminServiceError(
      `Cannot verify payment while the booking is ${booking.status}.`,
      "INVALID_TRANSITION",
    );
  }

  const statusSteps = bookingStepsToTicketingPending(booking.status);
  let nextStatus = booking.status;
  for (const next of statusSteps) {
    try {
      assertBookingTransition(nextStatus, next);
    } catch (error) {
      throw new AdminServiceError(
        error instanceof Error ? error.message : "Invalid booking status transition.",
        "INVALID_TRANSITION",
      );
    }
    nextStatus = next;
  }
  if (nextStatus === "CONFIRMED") {
    throw new AdminServiceError(
      "CONFIRMED requires authoritative supplier ticketing confirmation.",
      "INVALID_TRANSITION",
    );
  }

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

  let bookingStatus = booking.status;
  for (const next of statusSteps) {
    assertBookingTransition(bookingStatus, next);
    const updated = await bookingStore.repo.updateStatus(booking.id, next);
    if (!updated) {
      throw new AdminServiceError("Could not update booking status.", "VALIDATION");
    }
    bookingStatus = updated.status;
  }

  await writeAudit({
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

export type RecordOfflinePaymentInput = {
  actorId: string;
  actorRole: UserRole;
  bookingReference: string;
  method: string;
  amountReceived: number;
  receiptReference: string;
  note?: string;
};

export async function recordOfflineAdminPayment(
  input: RecordOfflinePaymentInput,
  deps?: OfflinePaymentDeps,
) {
  if (!canRecordOfflinePaymentRole(input.actorRole)) {
    throw new AdminServiceError("Admin access required.", "FORBIDDEN_ACTION");
  }
  if (!isOfflinePaymentMethod(input.method)) {
    throw new AdminServiceError("Unsupported offline payment method.", "VALIDATION");
  }

  const receiptReference = input.receiptReference.trim();
  if (receiptReference.length < 4 || receiptReference.length > 120) {
    throw new AdminServiceError(
      "A bank transaction or receipt reference of 4–120 characters is required.",
      "VALIDATION",
    );
  }

  const bookingStore = deps
    ? { repo: deps.bookingRepo, kind: "file" as const }
    : await getBookingRepository();
  const paymentStore = deps
    ? { repo: deps.paymentRepo, kind: "file" as const }
    : await getPaymentRepository();
  const writeAudit = deps?.writeAudit ?? writeAuditLog;

  if (!deps && isProductionAdminStoreRequired(paymentStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const booking = await bookingStore.repo.findByReference(input.bookingReference.trim());
  if (!booking) {
    throw new AdminServiceError("Booking not found.", "NOT_FOUND");
  }

  if (!canRecordOfflineAgainstStatus(booking.status)) {
    throw new AdminServiceError(
      `Offline payment cannot be recorded while the booking is ${booking.status}.`,
      "INVALID_TRANSITION",
    );
  }

  const allPayments = (await paymentStore.repo.listAll()).filter(
    (payment) => payment.bookingId === booking.id,
  );

  if (hasOpenCheckoutPayment(allPayments)) {
    throw new AdminServiceError(
      "An open checkout payment already exists. Verify that payment instead of recording a new offline payment.",
      "VALIDATION",
    );
  }

  const expectedTotal = roundPkrAmount(booking.totalAmount);
  const outstanding = outstandingBalance(expectedTotal, allPayments);
  const idempotencyKey = offlinePaymentIdempotencyKey(booking.id);
  const existingByKey = await paymentStore.repo.findByIdempotencyKey(idempotencyKey);
  if (existingByKey) {
    throw new AdminServiceError(
      "An offline payment has already been recorded for this booking.",
      "VALIDATION",
    );
  }
  if (outstanding <= 0) {
    throw new AdminServiceError("This booking is already fully paid.", "VALIDATION");
  }

  if (!Number.isFinite(input.amountReceived)) {
    throw new AdminServiceError("Enter a valid amount received.", "VALIDATION");
  }
  const amountReceived = roundPkrAmount(input.amountReceived);
  if (amountReceived <= 0) {
    throw new AdminServiceError("Amount received must be greater than zero.", "VALIDATION");
  }
  if (amountReceived < outstanding) {
    throw new AdminServiceError(
      "Amount received is less than the outstanding balance. Partial payments are not supported.",
      "VALIDATION",
    );
  }
  if (amountReceived > outstanding) {
    throw new AdminServiceError(
      "Amount received is greater than the outstanding balance.",
      "VALIDATION",
    );
  }

  const methodMap = toPrismaPaymentMethod(input.method);

  const paidAt = new Date().toISOString();
  const metadata = {
    channel: "offline",
    offlineMethod: methodMap.offlineMethod,
    recordedBy: input.actorId,
    adminNote: input.note?.trim() || null,
    expectedTotal,
    outstandingAtRecord: outstanding,
  };

  let payment: StoredPayment;
  let bookingStatus = booking.status;

  const usePrismaTransaction =
    !deps && bookingStore.kind === "prisma" && paymentStore.kind === "prisma";

  if (usePrismaTransaction) {
    try {
      const persisted = await prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: amountReceived,
            currency: booking.currency,
            status: "PAID",
            method: methodMap.method,
            provider: "OFFLINE",
            providerRef: receiptReference,
            paidAt: new Date(paidAt),
            isMock: false,
            idempotencyKey,
            metadata,
          },
        });
        let status = booking.status;
        for (const next of bookingStepsAfterFullOfflinePayment(booking.status)) {
          assertBookingTransition(status, next);
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: next },
          });
          status = next;
        }
        return { created, status };
      });
      payment = {
        id: persisted.created.id,
        bookingId: persisted.created.bookingId,
        amount: amountReceived,
        currency: persisted.created.currency,
        status: persisted.created.status,
        method: persisted.created.method,
        provider: persisted.created.provider,
        providerRef: persisted.created.providerRef,
        idempotencyKey: persisted.created.idempotencyKey,
        isMock: persisted.created.isMock,
        last4: persisted.created.last4,
        paidAt: persisted.created.paidAt?.toISOString() ?? paidAt,
        failureReason: persisted.created.failureReason,
        metadata,
        createdAt: persisted.created.createdAt.toISOString(),
        updatedAt: persisted.created.updatedAt.toISOString(),
        attempts: [],
        events: [],
      };
      bookingStatus = persisted.status;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AdminServiceError(
          "An offline payment has already been recorded for this booking.",
          "VALIDATION",
        );
      }
      throw error;
    }
  } else {
    try {
      payment = await paymentStore.repo.createPayment({
        bookingId: booking.id,
        amount: amountReceived,
        currency: booking.currency,
        provider: "OFFLINE",
        isMock: false,
        idempotencyKey,
        method: methodMap.method,
        status: "PAID",
        providerRef: receiptReference,
        paidAt,
        metadata,
      });
    } catch (error) {
      const raced = await paymentStore.repo.findByIdempotencyKey(idempotencyKey);
      const conflict =
        Boolean(raced) ||
        (error instanceof Error && error.message === "PAYMENT_IDEMPOTENCY_CONFLICT");
      if (conflict) {
        throw new AdminServiceError(
          "An offline payment has already been recorded for this booking.",
          "VALIDATION",
        );
      }
      throw error;
    }

    for (const next of bookingStepsAfterFullOfflinePayment(booking.status)) {
      assertBookingTransition(bookingStatus, next);
      const updated = await bookingStore.repo.updateStatus(booking.id, next);
      if (!updated) {
        throw new AdminServiceError("Could not update booking status.", "VALIDATION");
      }
      bookingStatus = updated.status;
    }
  }

  await writeAudit({
    userId: input.actorId,
    action: "OFFLINE_PAYMENT_RECORDED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: {
      bookingReference: booking.reference,
      method: methodMap.offlineMethod,
      storedMethod: methodMap.method,
      providerRef: receiptReference,
      amount: amountReceived,
      currency: booking.currency,
      bookingStatus,
    },
  });

  return {
    id: payment.id,
    status: payment.status,
    bookingReference: booking.reference,
    bookingStatus,
    amount: amountReceived,
    currency: booking.currency,
    method: methodMap.offlineMethod,
    providerRef: receiptReference,
  };
}

export const AdminPaymentService = {
  list: listAdminPayments,
  get: getAdminPaymentDetail,
  verify: verifyAdminPayment,
  refund: recordAdminPaymentRefund,
  recordOffline: recordOfflineAdminPayment,
};

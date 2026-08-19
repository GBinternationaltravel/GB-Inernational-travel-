import { getPaymentEnv } from "@/config/payment";
import { getBookingRepository } from "@/lib/booking/get-repository";
import type { StoredBooking } from "@/lib/booking/repository";
import { authorizeBookingPaymentAccess } from "@/lib/payment/authorize";
import { getPaymentRepository } from "@/lib/payment/get-repository";
import type { StoredPayment } from "@/lib/payment/repository";
import { writeAuditLog } from "@/lib/security/audit";
import {
  getPaymentProvider,
  getPaymentProviderByCode,
} from "@/providers/registry";
import type { VerifiedWebhookEvent } from "@/providers/payments/types";
import { sendNotification, dispatchTravelNotification } from "@/services/notification-service";
import type { SafePaymentView } from "@/types/payment";

export class PaymentServiceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "UNAUTHORIZED"
      | "VALIDATION"
      | "INVALID_BOOKING"
      | "AMOUNT_MISMATCH"
      | "ALREADY_PAID"
      | "PROVIDER"
      | "NOT_FOUND"
      | "SIGNATURE"
      | "DATABASE",
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

const payableStatuses = new Set([
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "FAILED",
]);

const paidPaymentStatuses = new Set(["PAID", "CAPTURED"]);

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

function toSafePayment(
  payment: StoredPayment,
  bookingReference: string,
  store: "prisma" | "file",
): SafePaymentView {
  const latestAttempt = [...payment.attempts].sort(
    (a, b) => b.attemptNumber - a.attemptNumber,
  )[0];
  return {
    id: payment.id,
    bookingReference,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider ?? "MOCK",
    isMock: payment.isMock,
    paidAt: payment.paidAt ?? null,
    failureReason: payment.failureReason ?? null,
    checkoutUrl: latestAttempt?.checkoutUrl ?? null,
    attemptId: latestAttempt?.id ?? null,
    store,
  };
}

function paymentIdempotencyKey(booking: StoredBooking): string {
  return `pay:${booking.id}:${booking.totalAmount.toFixed(2)}:${booking.currency}`;
}

/**
 * Creates a payment from the stored booking total (never trust client amounts)
 * and returns a provider checkout redirect URL.
 */
export async function createPaymentCheckout(reference: string): Promise<{
  payment: SafePaymentView;
  redirectUrl: string;
}> {
  const access = await authorizeBookingPaymentAccess(reference);
  if (!access) {
    throw new PaymentServiceError(
      "We couldn't authorize payment for this booking.",
      "UNAUTHORIZED",
    );
  }

  const booking = access.booking;
  if (!booking.termsAcceptedAt) {
    throw new PaymentServiceError(
      "Please accept the booking terms before paying.",
      "INVALID_BOOKING",
    );
  }
  if (
    booking.status === "PAYMENT_RECEIVED" ||
    booking.status === "TICKETING_PENDING" ||
    booking.status === "CONFIRMED"
  ) {
    throw new PaymentServiceError(
      "This booking has already received payment.",
      "ALREADY_PAID",
    );
  }
  if (!payableStatuses.has(booking.status)) {
    throw new PaymentServiceError(
      "This booking is not ready for payment.",
      "INVALID_BOOKING",
    );
  }

  const { repo: paymentRepo, kind } = await getPaymentRepository();
  const { repo: bookingRepo } = await getBookingRepository();
  const provider = getPaymentProvider();
  const env = getPaymentEnv();

  const existingPaid = await paymentRepo.findLatestByBookingId(booking.id);
  if (existingPaid && paidPaymentStatuses.has(existingPaid.status)) {
    throw new PaymentServiceError(
      "This booking has already been paid.",
      "ALREADY_PAID",
    );
  }

  const idempotencyKey = paymentIdempotencyKey(booking);
  let payment = await paymentRepo.findByIdempotencyKey(idempotencyKey);

  if (!payment) {
    payment = await paymentRepo.createPayment({
      bookingId: booking.id,
      amount: booking.totalAmount,
      currency: booking.currency,
      provider: provider.code,
      isMock: provider.isMock,
      idempotencyKey,
      metadata: {
        bookingReference: booking.reference,
        createdBy: access.mode,
      },
    });
  } else if (paidPaymentStatuses.has(payment.status)) {
    throw new PaymentServiceError(
      "This booking has already been paid.",
      "ALREADY_PAID",
    );
  }

  // Reuse open checkout if still available.
  const openAttempt = [...payment.attempts]
    .reverse()
    .find(
      (attempt) =>
        attempt.checkoutUrl &&
        ["CREATED", "REDIRECTED", "PROCESSING"].includes(attempt.status),
    );
  if (openAttempt?.checkoutUrl && payment.status !== "FAILED") {
    await bookingRepo.updateStatus(booking.id, "PAYMENT_PROCESSING");
    return {
      payment: toSafePayment(payment, booking.reference, kind),
      redirectUrl: openAttempt.checkoutUrl,
    };
  }

  const attemptNumber = payment.attempts.length + 1;
  const attemptKey = `${idempotencyKey}:attempt:${attemptNumber}`;
  const returnUrl = `${env.appUrl}/booking/payment/return?paymentId=${encodeURIComponent(payment.id)}&ref=${encodeURIComponent(booking.reference)}`;
  const cancelUrl = `${env.appUrl}/booking/payment/return?paymentId=${encodeURIComponent(payment.id)}&ref=${encodeURIComponent(booking.reference)}&status=cancelled`;
  const webhookUrl = `${env.appUrl}/api/payments/webhook/${provider.code.toLowerCase()}`;

  let checkout;
  try {
    checkout = await provider.createCheckout({
      paymentId: payment.id,
      attemptId: attemptKey,
      bookingReference: booking.reference,
      amount: payment.amount,
      currency: payment.currency,
      customerEmail: booking.contactEmail,
      returnUrl,
      cancelUrl,
      webhookUrl,
      metadata: {
        bookingReference: booking.reference,
      },
    });
  } catch (error) {
    throw new PaymentServiceError(
      error instanceof Error
        ? error.message
        : "We couldn't start the payment checkout.",
      "PROVIDER",
    );
  }

  const attempt = await paymentRepo.createAttempt({
    paymentId: payment.id,
    attemptNumber,
    provider: provider.code,
    amount: payment.amount,
    currency: payment.currency,
    idempotencyKey: attemptKey,
    returnUrl,
    checkoutUrl: checkout.checkoutUrl,
    providerCheckoutId: checkout.providerCheckoutId,
    rawRequest: {
      amount: payment.amount,
      currency: payment.currency,
      bookingReference: booking.reference,
    },
    rawResponse: checkout.rawResponse,
    status: "REDIRECTED",
  });

  await paymentRepo.updatePayment(payment.id, {
    status: "PROCESSING",
    providerRef: checkout.providerCheckoutId,
  });
  await bookingRepo.updateStatus(booking.id, "PAYMENT_PROCESSING");

  const refreshed = await paymentRepo.findById(payment.id);
  await writeAuditLog({
    action: "PAYMENT_CHECKOUT_CREATED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: {
      bookingReference: booking.reference,
      provider: provider.code,
      isMock: provider.isMock,
      amount: payment.amount,
      currency: payment.currency,
      attemptId: attempt.id,
      store: kind,
    },
    userId: access.userId,
  });

  return {
    payment: toSafePayment(
      refreshed ?? payment,
      booking.reference,
      kind,
    ),
    redirectUrl: checkout.checkoutUrl,
  };
}

export async function getPaymentForAuthorizedUser(
  paymentId: string,
): Promise<SafePaymentView> {
  const { repo: paymentRepo, kind } = await getPaymentRepository();
  const payment = await paymentRepo.findById(paymentId);
  if (!payment) {
    throw new PaymentServiceError("We couldn't find this payment.", "NOT_FOUND");
  }

  const access = await authorizeBookingPaymentAccessFromBookingId(payment.bookingId);
  if (!access) {
    throw new PaymentServiceError(
      "We couldn't authorize access to this payment.",
      "UNAUTHORIZED",
    );
  }

  return toSafePayment(payment, access.booking.reference, kind);
}

async function authorizeBookingPaymentAccessFromBookingId(bookingId: string) {
  const { repo } = await getBookingRepository();
  const booking = await repo.findById(bookingId);
  if (!booking) return null;
  return authorizeBookingPaymentAccess(booking.reference);
}

/**
 * Handles browser return from checkout. Does not trust client status alone —
 * final PAID state comes from verified webhook processing (or mock finalize).
 */
export async function handlePaymentReturn(input: {
  paymentId: string;
  clientStatus?: string | null;
}): Promise<{
  payment: SafePaymentView;
  outcome: "success" | "failure" | "pending" | "cancelled";
  bookingStatus: string;
}> {
  const { repo: paymentRepo, kind } = await getPaymentRepository();
  const { repo: bookingRepo } = await getBookingRepository();
  const payment = await paymentRepo.findById(input.paymentId);
  if (!payment) {
    throw new PaymentServiceError("We couldn't find this payment.", "NOT_FOUND");
  }

  const access = await authorizeBookingPaymentAccessFromBookingId(payment.bookingId);
  if (!access) {
    throw new PaymentServiceError(
      "We couldn't authorize access to this payment.",
      "UNAUTHORIZED",
    );
  }

  const booking = access.booking;

  if (paidPaymentStatuses.has(payment.status)) {
    return {
      payment: toSafePayment(payment, booking.reference, kind),
      outcome: "success",
      bookingStatus: booking.status,
    };
  }

  if (payment.status === "FAILED" || input.clientStatus === "failed") {
    return {
      payment: toSafePayment(payment, booking.reference, kind),
      outcome: "failure",
      bookingStatus: booking.status,
    };
  }

  if (input.clientStatus === "cancelled") {
    await paymentRepo.updatePayment(payment.id, {
      status: "CANCELLED",
      failureReason: "Customer cancelled checkout",
    });
    const latest = [...payment.attempts].sort((a, b) => b.attemptNumber - a.attemptNumber)[0];
    if (latest) {
      await paymentRepo.updateAttempt(latest.id, {
        status: "CANCELLED",
        completedAt: new Date().toISOString(),
      });
    }
    await bookingRepo.updateStatus(booking.id, "PENDING_PAYMENT");
    const refreshed = await paymentRepo.findById(payment.id);
    return {
      payment: toSafePayment(refreshed ?? payment, booking.reference, kind),
      outcome: "cancelled",
      bookingStatus: "PENDING_PAYMENT",
    };
  }

  // Mock provider may finalize via signed server call on return for local DX.
  if (payment.isMock && input.clientStatus === "success") {
    await applyVerifiedPaymentSuccess({
      payment,
      booking,
      providerRef: payment.providerRef ?? payment.id,
      amount: payment.amount,
      currency: payment.currency,
      eventId: `mock_return_${payment.id}`,
      source: "mock_return",
    });
    const refreshedPayment = await paymentRepo.findById(payment.id);
    const refreshedBooking = await bookingRepo.findById(booking.id);
    return {
      payment: toSafePayment(refreshedPayment ?? payment, booking.reference, kind),
      outcome: "success",
      bookingStatus: refreshedBooking?.status ?? "PAYMENT_RECEIVED",
    };
  }

  if (payment.isMock && input.clientStatus === "failed") {
    await applyVerifiedPaymentFailure({
      payment,
      booking,
      reason: "Mock checkout reported failure",
      eventId: `mock_return_fail_${payment.id}`,
    });
    const refreshedPayment = await paymentRepo.findById(payment.id);
    return {
      payment: toSafePayment(refreshedPayment ?? payment, booking.reference, kind),
      outcome: "failure",
      bookingStatus: "PENDING_PAYMENT",
    };
  }

  return {
    payment: toSafePayment(payment, booking.reference, kind),
    outcome: "pending",
    bookingStatus: booking.status,
  };
}

export async function processPaymentWebhook(
  providerCode: string,
  rawBody: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; result: string }> {
  const provider = getPaymentProviderByCode(providerCode.toUpperCase());
  const verified = await provider.verifyWebhook({ rawBody, headers });
  if (!verified) {
    throw new PaymentServiceError("Invalid webhook payload.", "VALIDATION");
  }

  const { repo: paymentRepo } = await getPaymentRepository();
  const { repo: bookingRepo } = await getBookingRepository();

  if (!verified.signatureValid) {
    await paymentRepo.createEvent({
      paymentId: null,
      provider: provider.code,
      eventType: verified.eventType,
      providerEventId: verified.providerEventId || `invalid_${Date.now()}`,
      signatureValid: false,
      payload: verified.rawPayload,
      headers,
    });
    throw new PaymentServiceError("Webhook signature verification failed.", "SIGNATURE");
  }

  // Idempotent event handling
  if (verified.providerEventId) {
    const existingEvent = await paymentRepo.findEventByProviderEventId(
      provider.code,
      verified.providerEventId,
    );
    if (existingEvent?.processed) {
      return { ok: true, result: "already_processed" };
    }
  }

  const payment =
    (verified.providerPaymentRef
      ? await paymentRepo.findByProviderRef(verified.providerPaymentRef)
      : null) ??
    (typeof verified.rawPayload.paymentId === "string"
      ? await paymentRepo.findById(verified.rawPayload.paymentId)
      : null);

  const event = await paymentRepo.createEvent({
    paymentId: payment?.id ?? null,
    provider: provider.code,
    eventType: verified.eventType,
    providerEventId: verified.providerEventId || `evt_${Date.now()}`,
    signatureValid: true,
    payload: verified.rawPayload,
    headers,
  });

  if (!payment) {
    await paymentRepo.markEventProcessed(event.id, "payment_not_found");
    return { ok: false, result: "payment_not_found" };
  }

  const booking = await bookingRepo.findById(payment.bookingId);
  if (!booking) {
    await paymentRepo.markEventProcessed(event.id, "booking_not_found");
    return { ok: false, result: "booking_not_found" };
  }

  // Amount & currency verification against stored booking/payment totals
  if (
    verified.status === "SUCCEEDED" &&
    (!amountsMatch(verified.amount, payment.amount) ||
      verified.currency.toUpperCase() !== payment.currency.toUpperCase() ||
      !amountsMatch(payment.amount, booking.totalAmount) ||
      payment.currency.toUpperCase() !== booking.currency.toUpperCase())
  ) {
    await paymentRepo.updatePayment(payment.id, {
      status: "FAILED",
      failureReason: "Amount or currency mismatch on webhook verification",
    });
    await bookingRepo.updateStatus(booking.id, "PENDING_PAYMENT");
    await paymentRepo.markEventProcessed(event.id, "amount_mismatch");
    await sendPaymentNotification(booking, "PAYMENT_FAILED");
    throw new PaymentServiceError(
      "Payment amount or currency did not match the booking total.",
      "AMOUNT_MISMATCH",
    );
  }

  if (verified.status === "SUCCEEDED") {
    await applyVerifiedPaymentSuccess({
      payment,
      booking,
      providerRef: verified.providerPaymentRef || payment.providerRef || payment.id,
      amount: verified.amount,
      currency: verified.currency,
      eventId: verified.providerEventId,
      source: "webhook",
    });
    await paymentRepo.markEventProcessed(event.id, "paid");
    return { ok: true, result: "paid" };
  }

  if (verified.status === "FAILED" || verified.status === "CANCELLED") {
    await applyVerifiedPaymentFailure({
      payment,
      booking,
      reason: `Provider reported ${verified.status}`,
      eventId: verified.providerEventId,
    });
    await paymentRepo.markEventProcessed(
      event.id,
      verified.status === "CANCELLED" ? "cancelled" : "failed",
    );
    return { ok: true, result: verified.status.toLowerCase() };
  }

  await paymentRepo.updatePayment(payment.id, { status: "PROCESSING" });
  await bookingRepo.updateStatus(booking.id, "PAYMENT_PROCESSING");
  await paymentRepo.markEventProcessed(event.id, "pending");
  return { ok: true, result: "pending" };
}

async function applyVerifiedPaymentSuccess(input: {
  payment: StoredPayment;
  booking: StoredBooking;
  providerRef: string;
  amount: number;
  currency: string;
  eventId: string;
  source: string;
}): Promise<void> {
  const { repo: paymentRepo } = await getPaymentRepository();
  const { repo: bookingRepo } = await getBookingRepository();

  // Idempotent: already paid → no ticket invention, no status regression
  if (paidPaymentStatuses.has(input.payment.status)) {
    return;
  }
  if (
    input.booking.status === "PAYMENT_RECEIVED" ||
    input.booking.status === "TICKETING_PENDING" ||
    input.booking.status === "CONFIRMED"
  ) {
    // Never invent CONFIRMED here; leave existing non-payment statuses alone.
    if (input.booking.status === "CONFIRMED") return;
  }

  if (
    !amountsMatch(input.amount, input.payment.amount) ||
    input.currency.toUpperCase() !== input.payment.currency.toUpperCase()
  ) {
    throw new PaymentServiceError(
      "Payment amount or currency did not match.",
      "AMOUNT_MISMATCH",
    );
  }

  await paymentRepo.updatePayment(input.payment.id, {
    status: "PAID",
    providerRef: input.providerRef,
    paidAt: new Date().toISOString(),
    failureReason: null,
  });

  const latest = [...input.payment.attempts].sort(
    (a, b) => b.attemptNumber - a.attemptNumber,
  )[0];
  if (latest) {
    await paymentRepo.updateAttempt(latest.id, {
      status: "SUCCEEDED",
      completedAt: new Date().toISOString(),
    });
  }

  // CRITICAL: payment success ≠ ticket issued. Do NOT set CONFIRMED.
  // Re-fetch booking so supplierBookingRef from earlier supplier-book is authoritative.
  const latestBooking =
    (await bookingRepo.findById(input.booking.id)) ?? input.booking;
  const nextBookingStatus = "TICKETING_PENDING";
  await bookingRepo.updateStatus(latestBooking.id, nextBookingStatus);

  await writeAuditLog({
    action: "PAYMENT_PAID",
    entityType: "Payment",
    entityId: input.payment.id,
    metadata: {
      bookingReference: latestBooking.reference,
      bookingStatus: nextBookingStatus,
      source: input.source,
      eventId: input.eventId,
      isMock: input.payment.isMock,
      amount: input.amount,
      currency: input.currency,
      supplierBookingRef: latestBooking.supplierBookingRef ?? null,
      note: "Ticket not issued — awaiting supplier ticketing confirmation",
    },
  });

  await sendPaymentNotification(latestBooking, "PAYMENT_RECEIVED");
  await sendPaymentNotification(latestBooking, "TICKETING_PENDING");
}

async function applyVerifiedPaymentFailure(input: {
  payment: StoredPayment;
  booking: StoredBooking;
  reason: string;
  eventId: string;
}): Promise<void> {
  const { repo: paymentRepo } = await getPaymentRepository();
  const { repo: bookingRepo } = await getBookingRepository();

  if (paidPaymentStatuses.has(input.payment.status)) {
    return;
  }

  await paymentRepo.updatePayment(input.payment.id, {
    status: "FAILED",
    failureReason: input.reason,
  });
  const latest = [...input.payment.attempts].sort(
    (a, b) => b.attemptNumber - a.attemptNumber,
  )[0];
  if (latest) {
    await paymentRepo.updateAttempt(latest.id, {
      status: "FAILED",
      errorMessage: input.reason,
      completedAt: new Date().toISOString(),
    });
  }
  await bookingRepo.updateStatus(input.booking.id, "PENDING_PAYMENT");
  await writeAuditLog({
    action: "PAYMENT_FAILED",
    entityType: "Payment",
    entityId: input.payment.id,
    metadata: {
      bookingReference: input.booking.reference,
      reason: input.reason,
      eventId: input.eventId,
    },
  });
  await sendPaymentNotification(input.booking, "PAYMENT_FAILED");
}

async function sendPaymentNotification(
  booking: StoredBooking,
  eventType: "PAYMENT_RECEIVED" | "PAYMENT_FAILED" | "TICKETING_PENDING",
): Promise<void> {
  try {
    if (eventType === "PAYMENT_FAILED") {
      await sendNotification({
        eventType: "PAYMENT_FAILED",
        channel: "EMAIL",
        recipient: booking.contactEmail,
        subject: "Payment unsuccessful",
        body: `Payment failed for booking ${booking.reference}. You can try again from the payment page.`,
        metadata: { bookingReference: booking.reference },
      });
      return;
    }

    await dispatchTravelNotification({
      template: eventType === "PAYMENT_RECEIVED" ? "PAYMENT_RECEIVED" : "TICKETING_PENDING",
      bookingReference: booking.reference,
      recipientEmail: booking.contactEmail,
      destinationCity: booking.offerSnapshot.destinationCity,
      flightNumber: booking.offerSnapshot.flightNumber,
      bookingId: booking.id,
      userId: booking.userId,
      idempotencyKey: `${eventType}:${booking.reference}:EMAIL`,
    });
  } catch {
    // Notification failures must not roll back payment state.
  }
}

/** Used by mock checkout to emit a signed webhook into the same verified path. */
export async function emitMockPaymentWebhook(input: {
  paymentId: string;
  status: "SUCCEEDED" | "FAILED" | "CANCELLED";
}): Promise<{ ok: boolean; result: string }> {
  const { repo: paymentRepo } = await getPaymentRepository();
  const payment = await paymentRepo.findById(input.paymentId);
  if (!payment) {
    throw new PaymentServiceError("We couldn't find this payment.", "NOT_FOUND");
  }

  const access = await authorizeBookingPaymentAccessFromBookingId(payment.bookingId);
  if (!access) {
    throw new PaymentServiceError(
      "We couldn't authorize this mock payment action.",
      "UNAUTHORIZED",
    );
  }

  const { mockWebhookSecret } = getPaymentEnv();
  const { signMockWebhook } = await import(
    "@/providers/payments/mock-payment-provider"
  );
  const timestamp = new Date().toISOString();
  const payload = {
    eventId: `mock_wh_${payment.id}_${input.status}_${Date.now()}`,
    eventType: `payment.${input.status.toLowerCase()}`,
    paymentId: payment.id,
    providerPaymentRef: payment.providerRef ?? payment.id,
    status: input.status,
    amount: payment.amount,
    currency: payment.currency,
  };
  const rawBody = JSON.stringify(payload);
  const signature = signMockWebhook(mockWebhookSecret, timestamp, rawBody);

  return processPaymentWebhook("MOCK", rawBody, {
    "x-gb-mock-signature": signature,
    "x-gb-mock-timestamp": timestamp,
    "content-type": "application/json",
  });
}

export type { VerifiedWebhookEvent };

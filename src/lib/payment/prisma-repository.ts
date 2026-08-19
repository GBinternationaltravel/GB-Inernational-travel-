import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  CreateAttemptInput,
  CreateEventInput,
  CreatePaymentInput,
  PaymentRepository,
  StoredPayment,
  StoredPaymentAttempt,
  StoredPaymentEvent,
} from "@/lib/payment/repository";

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : Number(value);
}

type PaymentFull = Prisma.PaymentGetPayload<{
  include: { attempts: true; events: true };
}>;

function mapAttempt(
  attempt: PaymentFull["attempts"][number],
): StoredPaymentAttempt {
  return {
    id: attempt.id,
    paymentId: attempt.paymentId,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    provider: attempt.provider,
    providerCheckoutId: attempt.providerCheckoutId,
    checkoutUrl: attempt.checkoutUrl,
    returnUrl: attempt.returnUrl,
    amount: toNumber(attempt.amount),
    currency: attempt.currency,
    idempotencyKey: attempt.idempotencyKey,
    errorMessage: attempt.errorMessage,
    rawRequest: (attempt.rawRequest as Record<string, unknown> | null) ?? null,
    rawResponse: (attempt.rawResponse as Record<string, unknown> | null) ?? null,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: attempt.completedAt?.toISOString() ?? null,
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
  };
}

function mapEvent(event: PaymentFull["events"][number]): StoredPaymentEvent {
  return {
    id: event.id,
    paymentId: event.paymentId,
    provider: event.provider,
    eventType: event.eventType,
    providerEventId: event.providerEventId,
    signatureValid: event.signatureValid,
    processed: event.processed,
    processingResult: event.processingResult,
    payload: (event.payload as Record<string, unknown> | null) ?? null,
    headers: (event.headers as Record<string, unknown> | null) ?? null,
    createdAt: event.createdAt.toISOString(),
  };
}

function mapPayment(payment: PaymentFull): StoredPayment {
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    amount: toNumber(payment.amount),
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    provider: payment.provider,
    providerRef: payment.providerRef,
    idempotencyKey: payment.idempotencyKey,
    isMock: payment.isMock,
    last4: payment.last4,
    paidAt: payment.paidAt?.toISOString() ?? null,
    failureReason: payment.failureReason,
    metadata: (payment.metadata as Record<string, unknown> | null) ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    attempts: payment.attempts.map(mapAttempt),
    events: payment.events.map(mapEvent),
  };
}

const includeAll = {
  attempts: { orderBy: { attemptNumber: "asc" as const } },
  events: { orderBy: { createdAt: "asc" as const } },
};

export class PrismaPaymentRepository implements PaymentRepository {
  async findById(id: string): Promise<StoredPayment | null> {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: includeAll,
    });
    return payment ? mapPayment(payment) : null;
  }

  async findByIdempotencyKey(key: string): Promise<StoredPayment | null> {
    const payment = await prisma.payment.findUnique({
      where: { idempotencyKey: key },
      include: includeAll,
    });
    return payment ? mapPayment(payment) : null;
  }

  async findLatestByBookingId(bookingId: string): Promise<StoredPayment | null> {
    const payment = await prisma.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
      include: includeAll,
    });
    return payment ? mapPayment(payment) : null;
  }

  async findByProviderRef(providerRef: string): Promise<StoredPayment | null> {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { providerRef },
          { attempts: { some: { providerCheckoutId: providerRef } } },
        ],
      },
      include: includeAll,
    });
    return payment ? mapPayment(payment) : null;
  }

  async listAll(): Promise<StoredPayment[]> {
    const payments = await prisma.payment.findMany({
      include: includeAll,
      orderBy: { createdAt: "desc" },
    });
    return payments.map(mapPayment);
  }

  async createPayment(input: CreatePaymentInput): Promise<StoredPayment> {
    const payment = await prisma.payment.create({
      data: {
        bookingId: input.bookingId,
        amount: input.amount,
        currency: input.currency,
        status: "PENDING",
        method: "CARD",
        provider: input.provider,
        isMock: input.isMock,
        idempotencyKey: input.idempotencyKey,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      include: includeAll,
    });
    return mapPayment(payment);
  }

  async createAttempt(input: CreateAttemptInput): Promise<StoredPaymentAttempt> {
    const attempt = await prisma.paymentAttempt.create({
      data: {
        paymentId: input.paymentId,
        attemptNumber: input.attemptNumber,
        status: input.status ?? "CREATED",
        provider: input.provider,
        providerCheckoutId: input.providerCheckoutId,
        checkoutUrl: input.checkoutUrl,
        returnUrl: input.returnUrl,
        amount: input.amount,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
        rawRequest: (input.rawRequest ?? undefined) as Prisma.InputJsonValue | undefined,
        rawResponse: (input.rawResponse ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return mapAttempt(attempt);
  }

  async updatePayment(
    id: string,
    data: Partial<{
      status: StoredPayment["status"];
      providerRef: string | null;
      paidAt: string | null;
      failureReason: string | null;
      metadata: Record<string, unknown> | null;
    }>,
  ): Promise<StoredPayment | null> {
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status: data.status,
        providerRef: data.providerRef === undefined ? undefined : data.providerRef,
        paidAt: data.paidAt === undefined ? undefined : data.paidAt ? new Date(data.paidAt) : null,
        failureReason:
          data.failureReason === undefined ? undefined : data.failureReason,
        metadata:
          data.metadata === undefined
            ? undefined
            : ((data.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue),
      },
      include: includeAll,
    });
    return mapPayment(payment);
  }

  async updateAttempt(
    id: string,
    data: Partial<{
      status: StoredPaymentAttempt["status"];
      checkoutUrl: string | null;
      providerCheckoutId: string | null;
      errorMessage: string | null;
      rawResponse: Record<string, unknown> | null;
      completedAt: string | null;
    }>,
  ): Promise<StoredPaymentAttempt | null> {
    const attempt = await prisma.paymentAttempt.update({
      where: { id },
      data: {
        status: data.status,
        checkoutUrl: data.checkoutUrl === undefined ? undefined : data.checkoutUrl,
        providerCheckoutId:
          data.providerCheckoutId === undefined ? undefined : data.providerCheckoutId,
        errorMessage: data.errorMessage === undefined ? undefined : data.errorMessage,
        rawResponse:
          data.rawResponse === undefined
            ? undefined
            : ((data.rawResponse ?? Prisma.JsonNull) as Prisma.InputJsonValue),
        completedAt:
          data.completedAt === undefined
            ? undefined
            : data.completedAt
              ? new Date(data.completedAt)
              : null,
      },
    });
    return mapAttempt(attempt);
  }

  async createEvent(input: CreateEventInput): Promise<StoredPaymentEvent> {
    const event = await prisma.paymentEvent.create({
      data: {
        paymentId: input.paymentId ?? undefined,
        provider: input.provider,
        eventType: input.eventType,
        providerEventId: input.providerEventId ?? undefined,
        signatureValid: input.signatureValid,
        payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        headers: (input.headers ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return mapEvent(event);
  }

  async findEventByProviderEventId(
    provider: string,
    providerEventId: string,
  ): Promise<StoredPaymentEvent | null> {
    const event = await prisma.paymentEvent.findUnique({
      where: {
        provider_providerEventId: { provider, providerEventId },
      },
    });
    return event ? mapEvent(event) : null;
  }

  async markEventProcessed(
    id: string,
    processingResult: string,
  ): Promise<StoredPaymentEvent | null> {
    const event = await prisma.paymentEvent.update({
      where: { id },
      data: { processed: true, processingResult },
    });
    return mapEvent(event);
  }
}

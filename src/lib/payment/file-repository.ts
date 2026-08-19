import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type {
  CreateAttemptInput,
  CreateEventInput,
  CreatePaymentInput,
  PaymentRepository,
  StoredPayment,
  StoredPaymentAttempt,
  StoredPaymentEvent,
} from "@/lib/payment/repository";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "payments.json");

type PaymentStore = {
  payments: StoredPayment[];
};

async function readStore(): Promise<PaymentStore> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as PaymentStore;
  } catch {
    return { payments: [] };
  }
}

async function writeStore(store: PaymentStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export class FilePaymentRepository implements PaymentRepository {
  async findById(id: string): Promise<StoredPayment | null> {
    const store = await readStore();
    return store.payments.find((payment) => payment.id === id) ?? null;
  }

  async findByIdempotencyKey(key: string): Promise<StoredPayment | null> {
    const store = await readStore();
    return store.payments.find((payment) => payment.idempotencyKey === key) ?? null;
  }

  async findLatestByBookingId(bookingId: string): Promise<StoredPayment | null> {
    const store = await readStore();
    const matches = store.payments
      .filter((payment) => payment.bookingId === bookingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return matches[0] ?? null;
  }

  async findByProviderRef(providerRef: string): Promise<StoredPayment | null> {
    const store = await readStore();
    return (
      store.payments.find(
        (payment) =>
          payment.id !== "orphan-events" &&
          (payment.providerRef === providerRef ||
            payment.attempts.some((attempt) => attempt.providerCheckoutId === providerRef)),
      ) ?? null
    );
  }

  async listAll(): Promise<StoredPayment[]> {
    const store = await readStore();
    return store.payments
      .filter((payment) => payment.id !== "orphan-events")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createPayment(input: CreatePaymentInput): Promise<StoredPayment> {
    const store = await readStore();
    const now = new Date().toISOString();
    const payment: StoredPayment = {
      id: randomUUID(),
      bookingId: input.bookingId,
      amount: input.amount,
      currency: input.currency,
      status: "PENDING",
      method: "CARD",
      provider: input.provider,
      providerRef: null,
      idempotencyKey: input.idempotencyKey,
      isMock: input.isMock,
      last4: null,
      paidAt: null,
      failureReason: null,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
      attempts: [],
      events: [],
    };
    store.payments.push(payment);
    await writeStore(store);
    return payment;
  }

  async createAttempt(input: CreateAttemptInput): Promise<StoredPaymentAttempt> {
    const store = await readStore();
    const payment = store.payments.find((item) => item.id === input.paymentId);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    const now = new Date().toISOString();
    const attempt: StoredPaymentAttempt = {
      id: randomUUID(),
      paymentId: input.paymentId,
      attemptNumber: input.attemptNumber,
      status: input.status ?? "CREATED",
      provider: input.provider,
      providerCheckoutId: input.providerCheckoutId ?? null,
      checkoutUrl: input.checkoutUrl ?? null,
      returnUrl: input.returnUrl,
      amount: input.amount,
      currency: input.currency,
      idempotencyKey: input.idempotencyKey,
      errorMessage: null,
      rawRequest: input.rawRequest ?? null,
      rawResponse: input.rawResponse ?? null,
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    payment.attempts.push(attempt);
    payment.updatedAt = now;
    await writeStore(store);
    return attempt;
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
    const store = await readStore();
    const payment = store.payments.find((item) => item.id === id);
    if (!payment) return null;
    Object.assign(payment, data, { updatedAt: new Date().toISOString() });
    await writeStore(store);
    return payment;
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
    const store = await readStore();
    for (const payment of store.payments) {
      const attempt = payment.attempts.find((item) => item.id === id);
      if (!attempt) continue;
      Object.assign(attempt, data, { updatedAt: new Date().toISOString() });
      payment.updatedAt = new Date().toISOString();
      await writeStore(store);
      return attempt;
    }
    return null;
  }

  async createEvent(input: CreateEventInput): Promise<StoredPaymentEvent> {
    const store = await readStore();
    const event: StoredPaymentEvent = {
      id: randomUUID(),
      paymentId: input.paymentId ?? null,
      provider: input.provider,
      eventType: input.eventType,
      providerEventId: input.providerEventId ?? null,
      signatureValid: input.signatureValid,
      processed: false,
      processingResult: null,
      payload: input.payload ?? null,
      headers: input.headers ?? null,
      createdAt: new Date().toISOString(),
    };

    if (input.paymentId) {
      const payment = store.payments.find((item) => item.id === input.paymentId);
      if (payment) payment.events.push(event);
    } else {
      // Orphan events attached to a synthetic bucket payment for auditability.
      let orphan = store.payments.find((item) => item.id === "orphan-events");
      if (!orphan) {
        const now = new Date().toISOString();
        orphan = {
          id: "orphan-events",
          bookingId: "orphan",
          amount: 0,
          currency: "PKR",
          status: "CANCELLED",
      method: "CARD",
      provider: input.provider,
      isMock: true,
      createdAt: now,
      updatedAt: now,
      attempts: [],
      events: [],
        };
        store.payments.push(orphan);
      }
      orphan.events.push(event);
    }

    await writeStore(store);
    return event;
  }

  async findEventByProviderEventId(
    provider: string,
    providerEventId: string,
  ): Promise<StoredPaymentEvent | null> {
    const store = await readStore();
    for (const payment of store.payments) {
      const event = payment.events.find(
        (item) => item.provider === provider && item.providerEventId === providerEventId,
      );
      if (event) return event;
    }
    return null;
  }

  async markEventProcessed(
    id: string,
    processingResult: string,
  ): Promise<StoredPaymentEvent | null> {
    const store = await readStore();
    for (const payment of store.payments) {
      const event = payment.events.find((item) => item.id === id);
      if (!event) continue;
      event.processed = true;
      event.processingResult = processingResult;
      await writeStore(store);
      return event;
    }
    return null;
  }
}

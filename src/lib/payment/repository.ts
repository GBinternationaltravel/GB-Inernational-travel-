import type {
  PaymentAttemptStatus,
  PaymentStatus,
} from "@prisma/client";

export type StoredPaymentAttempt = {
  id: string;
  paymentId: string;
  attemptNumber: number;
  status: PaymentAttemptStatus;
  provider: string;
  providerCheckoutId?: string | null;
  checkoutUrl?: string | null;
  returnUrl?: string | null;
  amount: number;
  currency: string;
  idempotencyKey: string;
  errorMessage?: string | null;
  rawRequest?: Record<string, unknown> | null;
  rawResponse?: Record<string, unknown> | null;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoredPaymentEvent = {
  id: string;
  paymentId?: string | null;
  provider: string;
  eventType: string;
  providerEventId?: string | null;
  signatureValid: boolean;
  processed: boolean;
  processingResult?: string | null;
  payload?: Record<string, unknown> | null;
  headers?: Record<string, unknown> | null;
  createdAt: string;
};

export type StoredPayment = {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: "CARD" | "BANK_TRANSFER" | "WALLET" | "CASH" | "OTHER";
  provider?: string | null;
  providerRef?: string | null;
  idempotencyKey?: string | null;
  isMock: boolean;
  last4?: string | null;
  paidAt?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  attempts: StoredPaymentAttempt[];
  events: StoredPaymentEvent[];
};

export type CreatePaymentInput = {
  bookingId: string;
  amount: number;
  currency: string;
  provider: string;
  isMock: boolean;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type CreateAttemptInput = {
  paymentId: string;
  attemptNumber: number;
  provider: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  returnUrl: string;
  checkoutUrl?: string;
  providerCheckoutId?: string;
  rawRequest?: Record<string, unknown>;
  rawResponse?: Record<string, unknown>;
  status?: PaymentAttemptStatus;
};

export type CreateEventInput = {
  paymentId?: string | null;
  provider: string;
  eventType: string;
  providerEventId?: string | null;
  signatureValid: boolean;
  payload?: Record<string, unknown>;
  headers?: Record<string, unknown>;
};

export interface PaymentRepository {
  findById(id: string): Promise<StoredPayment | null>;
  findByIdempotencyKey(key: string): Promise<StoredPayment | null>;
  findLatestByBookingId(bookingId: string): Promise<StoredPayment | null>;
  findByProviderRef(providerRef: string): Promise<StoredPayment | null>;
  listAll(): Promise<StoredPayment[]>;
  createPayment(input: CreatePaymentInput): Promise<StoredPayment>;
  createAttempt(input: CreateAttemptInput): Promise<StoredPaymentAttempt>;
  updatePayment(
    id: string,
    data: Partial<{
      status: PaymentStatus;
      providerRef: string | null;
      paidAt: string | null;
      failureReason: string | null;
      metadata: Record<string, unknown> | null;
    }>,
  ): Promise<StoredPayment | null>;
  updateAttempt(
    id: string,
    data: Partial<{
      status: PaymentAttemptStatus;
      checkoutUrl: string | null;
      providerCheckoutId: string | null;
      errorMessage: string | null;
      rawResponse: Record<string, unknown> | null;
      completedAt: string | null;
    }>,
  ): Promise<StoredPaymentAttempt | null>;
  createEvent(input: CreateEventInput): Promise<StoredPaymentEvent>;
  findEventByProviderEventId(
    provider: string,
    providerEventId: string,
  ): Promise<StoredPaymentEvent | null>;
  markEventProcessed(
    id: string,
    processingResult: string,
  ): Promise<StoredPaymentEvent | null>;
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BookingStatus, UserRole } from "@prisma/client";
import type { StoredBooking, BookingRepository } from "@/lib/booking/repository";
import type { OfferSnapshot } from "@/lib/booking/pricing";
import type {
  CreatePaymentInput,
  PaymentRepository,
  StoredPayment,
} from "@/lib/payment/repository";
import { hasPermission } from "@/lib/auth/permissions";
import {
  bookingStepsAfterFullOfflinePayment,
  canIssueTicketFromStatus,
  canRecordOfflinePaymentRole,
  offlinePaymentIdempotencyKey,
  outstandingBalance,
  ticketAlreadyIssued,
  toPrismaPaymentMethod,
} from "@/lib/payment/offline";
import { AdminServiceError } from "@/services/admin-booking-service";
import {
  recordOfflineAdminPayment,
  verifyAdminPayment,
} from "@/services/admin-payment-service";
import type { AuditLogInput } from "@/lib/security/audit";

const TOTAL = 45_000;

function snapshot(): OfferSnapshot {
  return {
    origin: "ISB",
    destination: "GIL",
    originCity: "Islamabad",
    destinationCity: "Gilgit",
    departureAt: "2026-11-01T05:00:00.000Z",
    arrivalAt: "2026-11-01T06:00:00.000Z",
    airlineName: "PIA",
    flightNumber: "PK605",
    cabinClass: "ECONOMY",
    baggageKg: 20,
    stops: 0,
    supplierCode: "INVENTORY",
    pricing: {
      currency: "PKR",
      supplierFare: 43_500,
      markupAmount: 0,
      markupRate: 0,
      taxesAmount: 0,
      feesAmount: 1_500,
      totalAmount: TOTAL,
      notice: "test",
    },
  } as OfferSnapshot;
}

function booking(overrides: Partial<StoredBooking> = {}): StoredBooking {
  const now = new Date().toISOString();
  return {
    id: "bkg_offline_1",
    reference: "GB-OFF-1",
    accessTokenHash: "hash",
    tripType: "ONE_WAY",
    status: "PENDING_PAYMENT",
    currency: "PKR",
    subtotalAmount: 43_500,
    taxesAmount: 0,
    feesAmount: 1_500,
    totalAmount: TOTAL,
    contactEmail: "guest@example.com",
    contactPhone: "3001234567",
    contactPhoneCountry: "+92",
    selectedOfferId: "offer_1",
    offerSnapshot: snapshot(),
    providerCode: "INVENTORY",
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "ECONOMY",
    createdAt: now,
    updatedAt: now,
    passengers: [],
    ...overrides,
  };
}

function paymentStub(overrides: Partial<StoredPayment> = {}): StoredPayment {
  const now = new Date().toISOString();
  return {
    id: "pay_existing",
    bookingId: "bkg_offline_1",
    amount: TOTAL,
    currency: "PKR",
    status: "PENDING",
    method: "CARD",
    provider: "MOCK",
    providerRef: null,
    idempotencyKey: "checkout:bkg_offline_1",
    isMock: true,
    createdAt: now,
    updatedAt: now,
    attempts: [],
    events: [],
    ...overrides,
  };
}

class MemoryBookingRepo implements BookingRepository {
  statusHistory: BookingStatus[] = [];

  constructor(private rows: StoredBooking[]) {}

  async findByReference(reference: string) {
    return this.rows.find((row) => row.reference === reference) ?? null;
  }
  async findById(id: string) {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async updateStatus(id: string, status: BookingStatus) {
    const row = this.rows.find((item) => item.id === id);
    if (!row) return null;
    this.statusHistory.push(status);
    row.status = status;
    row.updatedAt = new Date().toISOString();
    return row;
  }
  async createDraft(): Promise<StoredBooking> {
    throw new Error("unused");
  }
  async updateDraft(): Promise<StoredBooking | null> {
    throw new Error("unused");
  }
  async acceptTerms(): Promise<StoredBooking | null> {
    throw new Error("unused");
  }
  async listByUserId(): Promise<StoredBooking[]> {
    return [];
  }
  async listAll(): Promise<StoredBooking[]> {
    return this.rows;
  }
  async attachUser(): Promise<StoredBooking | null> {
    throw new Error("unused");
  }
}

class MemoryPaymentRepo implements PaymentRepository {
  payments: StoredPayment[] = [];
  private reserved = new Set<string>();

  constructor(seed: StoredPayment[] = []) {
    this.payments = [...seed];
  }

  async findById(id: string) {
    return this.payments.find((item) => item.id === id) ?? null;
  }
  async findByIdempotencyKey(key: string) {
    return this.payments.find((item) => item.idempotencyKey === key) ?? null;
  }
  async findLatestByBookingId(bookingId: string) {
    return this.payments.find((item) => item.bookingId === bookingId) ?? null;
  }
  async findByProviderRef(providerRef: string) {
    return this.payments.find((item) => item.providerRef === providerRef) ?? null;
  }
  async listAll() {
    return [...this.payments];
  }
  async createPayment(input: CreatePaymentInput): Promise<StoredPayment> {
    if (
      this.reserved.has(input.idempotencyKey) ||
      this.payments.some((item) => item.idempotencyKey === input.idempotencyKey)
    ) {
      throw new Error("PAYMENT_IDEMPOTENCY_CONFLICT");
    }
    this.reserved.add(input.idempotencyKey);
    await new Promise((resolve) => setTimeout(resolve, 15));
    const now = new Date().toISOString();
    const payment: StoredPayment = {
      id: `pay_${this.payments.length + 1}`,
      bookingId: input.bookingId,
      amount: input.amount,
      currency: input.currency,
      status: input.status ?? "PENDING",
      method: input.method ?? "CARD",
      provider: input.provider,
      providerRef: input.providerRef ?? null,
      idempotencyKey: input.idempotencyKey,
      isMock: input.isMock,
      paidAt: input.paidAt ?? null,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
      attempts: [],
      events: [],
    };
    this.payments.push(payment);
    return payment;
  }
  async updatePayment(id: string, data: Partial<StoredPayment>) {
    const payment = this.payments.find((item) => item.id === id);
    if (!payment) return null;
    Object.assign(payment, data, { updatedAt: new Date().toISOString() });
    return payment;
  }
  async createAttempt(): Promise<never> {
    throw new Error("unused");
  }
  async updateAttempt(): Promise<never> {
    throw new Error("unused");
  }
  async createEvent(): Promise<never> {
    throw new Error("unused");
  }
  async findEventByProviderEventId(): Promise<null> {
    return null;
  }
  async markEventProcessed(): Promise<null> {
    return null;
  }
}

function harness(options?: {
  booking?: Partial<StoredBooking>;
  payments?: StoredPayment[];
}) {
  const row = booking(options?.booking);
  const audits: AuditLogInput[] = [];
  const deps = {
    bookingRepo: new MemoryBookingRepo([row]),
    paymentRepo: new MemoryPaymentRepo(options?.payments ?? []),
    writeAudit: async (input: AuditLogInput) => {
      audits.push(input);
    },
  };
  return { row, audits, deps };
}

async function record(
  deps: ReturnType<typeof harness>["deps"],
  overrides: Partial<Parameters<typeof recordOfflineAdminPayment>[0]> = {},
) {
  return recordOfflineAdminPayment(
    {
      actorId: "admin_1",
      actorRole: "ADMIN",
      bookingReference: "GB-OFF-1",
      method: "BANK_TRANSFER",
      amountReceived: TOTAL,
      receiptReference: "HBL-998877",
      note: "Received at counter",
      ...overrides,
    },
    deps,
  );
}

function expectError(error: unknown, code: string, message?: RegExp) {
  assert.ok(error instanceof AdminServiceError, String(error));
  assert.equal(error.code, code);
  if (message) assert.match(error.message, message);
}

describe("offline payment helpers", () => {
  it("maps cash to OTHER without a schema change", () => {
    assert.deepEqual(toPrismaPaymentMethod("CASH"), {
      method: "OTHER",
      offlineMethod: "CASH",
    });
  });

  it("uses a booking-scoped idempotency key", () => {
    assert.equal(offlinePaymentIdempotencyKey("bkg_offline_1"), "offline:bkg_offline_1");
  });

  it("walks legal status steps and never includes CONFIRMED", () => {
    assert.deepEqual(bookingStepsAfterFullOfflinePayment("PENDING_PAYMENT"), [
      "PAYMENT_RECEIVED",
      "TICKETING_PENDING",
    ]);
    assert.ok(!bookingStepsAfterFullOfflinePayment("PENDING_PAYMENT").includes("CONFIRMED"));
    assert.equal(canIssueTicketFromStatus("TICKETING_PENDING"), true);
    assert.equal(canIssueTicketFromStatus("CONFIRMED"), false);
    assert.equal(ticketAlreadyIssued("CONFIRMED", "ISSUED_MANUAL"), true);
    assert.equal(ticketAlreadyIssued("TICKETING_PENDING", null), false);
  });

  it("limits recording to payments.verify roles", () => {
    const allowed: UserRole[] = ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"];
    const denied: UserRole[] = [
      "CUSTOMER",
      "MANAGER",
      "TICKET_ISSUER",
      "SUPPORT",
      "STAFF",
      "AGENT",
    ];
    for (const role of allowed) assert.equal(canRecordOfflinePaymentRole(role), true);
    for (const role of denied) assert.equal(canRecordOfflinePaymentRole(role), false);
  });
});

describe("recordOfflineAdminPayment", () => {
  it("records a full bank-transfer payment and moves the booking to TICKETING_PENDING", async () => {
    const { row, audits, deps } = harness();
    const result = await record(deps);
    assert.equal(result.status, "PAID");
    assert.equal(result.bookingStatus, "TICKETING_PENDING");
    assert.equal(result.amount, TOTAL);
    assert.equal(result.method, "BANK_TRANSFER");
    assert.equal(row.status, "TICKETING_PENDING");
    assert.notEqual(row.status, "CONFIRMED");
    const stored = (await deps.paymentRepo.listAll())[0];
    assert.equal(stored.provider, "OFFLINE");
    assert.equal(stored.isMock, false);
    assert.equal(stored.method, "BANK_TRANSFER");
    assert.equal(stored.idempotencyKey, "offline:bkg_offline_1");
    assert.equal(audits[0]?.action, "OFFLINE_PAYMENT_RECORDED");
    assert.equal(audits[0]?.metadata?.amount, TOTAL);
    assert.equal(canIssueTicketFromStatus(result.bookingStatus), true);
    assert.equal(ticketAlreadyIssued(result.bookingStatus, row.supplierTicketingStatus), false);
  });

  it("stores cash as OTHER plus metadata.offlineMethod", async () => {
    const { deps } = harness();
    await record(deps, { method: "CASH", receiptReference: "CASH-desk-01" });
    const stored = (await deps.paymentRepo.listAll())[0];
    assert.equal(stored.method, "OTHER");
    assert.equal(stored.metadata?.offlineMethod, "CASH");
  });

  it("rejects an unknown booking reference", async () => {
    const { deps } = harness();
    await assert.rejects(
      () => record(deps, { bookingReference: "GB-MISSING" }),
      (error) => {
        expectError(error, "NOT_FOUND", /not found/i);
        return true;
      },
    );
  });

  it("rejects invalid, zero, negative, and excessive amounts", async () => {
    for (const amount of [Number.NaN, 0, -100, TOTAL + 1]) {
      const { deps } = harness();
      await assert.rejects(
        () => record(deps, { amountReceived: amount }),
        (error) => {
          expectError(error, "VALIDATION");
          return true;
        },
      );
      assert.equal((await deps.paymentRepo.listAll()).length, 0);
    }
  });

  it("rejects underpayment and does not mark the booking paid", async () => {
    const { row, deps } = harness();
    await assert.rejects(
      () => record(deps, { amountReceived: TOTAL - 500 }),
      (error) => {
        expectError(error, "VALIDATION", /less than the outstanding/i);
        return true;
      },
    );
    assert.equal(row.status, "PENDING_PAYMENT");
    assert.equal(outstandingBalance(TOTAL, await deps.paymentRepo.listAll()), TOTAL);
  });

  it("rejects unauthorized roles", async () => {
    const denied: UserRole[] = ["CUSTOMER", "STAFF", "MANAGER", "TICKET_ISSUER", "SUPPORT", "AGENT"];
    for (const actorRole of denied) {
      const { deps } = harness();
      await assert.rejects(
        () => record(deps, { actorRole }),
        (error) => {
          expectError(error, "FORBIDDEN_ACTION");
          return true;
        },
      );
    }
  });

  it("rejects a second submission for the same booking", async () => {
    const { deps } = harness();
    await record(deps);
    await assert.rejects(
      () => record(deps, { receiptReference: "HBL-second" }),
      (error) => {
        expectError(error, "VALIDATION", /already been recorded/i);
        return true;
      },
    );
    assert.equal((await deps.paymentRepo.listAll()).length, 1);
  });

  it("rejects concurrent duplicate attempts", async () => {
    const { deps } = harness();
    const results = await Promise.allSettled([record(deps), record(deps, { receiptReference: "HBL-race" })]);
    const fulfilled = results.filter((item) => item.status === "fulfilled");
    const rejected = results.filter((item) => item.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    if (rejected[0]?.status === "rejected") {
      expectError(rejected[0].reason, "VALIDATION", /already been recorded/i);
    }
    assert.equal((await deps.paymentRepo.listAll()).length, 1);
  });

  it("rejects an open checkout payment so staff verify that row instead", async () => {
    const { deps } = harness({
      payments: [paymentStub({ status: "PENDING" })],
    });
    await assert.rejects(
      () => record(deps),
      (error) => {
        expectError(error, "VALIDATION", /open checkout/i);
        return true;
      },
    );
  });

  it("does not set CONFIRMED and leaves ticket issuance as a separate action", async () => {
    const { row, deps } = harness();
    const result = await record(deps);
    assert.equal(result.bookingStatus, "TICKETING_PENDING");
    assert.equal(canIssueTicketFromStatus(result.bookingStatus), true);
    assert.equal(ticketAlreadyIssued("TICKETING_PENDING", null), false);
    row.status = "CONFIRMED";
    row.supplierTicketingStatus = "ISSUED_MANUAL";
    assert.equal(ticketAlreadyIssued(row.status, row.supplierTicketingStatus), true);
    assert.equal(canIssueTicketFromStatus(row.status), false);
  });
});

describe("offline payment compatibility with verify", () => {
  it("still verifies an existing pending checkout payment", async () => {
    const existing = paymentStub({ status: "PENDING", id: "pay_checkout" });
    const { row, audits, deps } = harness({
      booking: { status: "PAYMENT_PROCESSING" },
      payments: [existing],
    });
    const verified = await verifyAdminPayment(
      { actorId: "admin_1", paymentId: "pay_checkout", providerRef: "SAFE-1234" },
      deps,
    );
    assert.equal(verified.status, "PAID");
    assert.equal(existing.status, "PAID");
    assert.equal(row.status, "TICKETING_PENDING");
    assert.deepEqual(deps.bookingRepo.statusHistory, ["PAYMENT_RECEIVED", "TICKETING_PENDING"]);
    assert.equal(audits[0]?.action, "PAYMENT_VERIFIED");
  });

  it("refuses to re-verify a recorded offline payment", async () => {
    const { deps } = harness();
    const created = await record(deps);
    await assert.rejects(
      () =>
        verifyAdminPayment(
          { actorId: "admin_1", paymentId: created.id, providerRef: "DUP-9999" },
          deps,
        ),
      (error) => {
        expectError(error, "VALIDATION", /already finalized/i);
        return true;
      },
    );
  });
});

describe("verifyAdminPayment status transitions", () => {
  it("walks legal hops from PENDING_PAYMENT to TICKETING_PENDING and never CONFIRMED", async () => {
    const existing = paymentStub({ status: "PENDING", id: "pay_verify" });
    const { row, audits, deps } = harness({ payments: [existing] });
    const verified = await verifyAdminPayment(
      { actorId: "admin_1", paymentId: "pay_verify", providerRef: "HBL-VER-01" },
      deps,
    );
    assert.equal(verified.status, "PAID");
    assert.equal(row.status, "TICKETING_PENDING");
    assert.notEqual(row.status, "CONFIRMED");
    assert.deepEqual(deps.bookingRepo.statusHistory, ["PAYMENT_RECEIVED", "TICKETING_PENDING"]);
    assert.equal(canIssueTicketFromStatus(row.status), true);
    assert.equal(ticketAlreadyIssued(row.status, row.supplierTicketingStatus), false);
    assert.equal(audits[0]?.action, "PAYMENT_VERIFIED");
    assert.equal(audits[0]?.metadata?.providerRef, "HBL-VER-01");
    assert.equal(audits[0]?.metadata?.amount, TOTAL);
  });

  it("rejects booking statuses that cannot legally reach TICKETING_PENDING", async () => {
    const invalid: BookingStatus[] = [
      "DRAFT",
      "CONFIRMED",
      "CANCELLED",
      "REFUNDED",
      "FAILED",
      "EXPIRED",
    ];
    for (const status of invalid) {
      const existing = paymentStub({ status: "PENDING", id: `pay_${status}` });
      const { row, deps } = harness({
        booking: { status, id: "bkg_offline_1" },
        payments: [existing],
      });
      await assert.rejects(
        () =>
          verifyAdminPayment(
            { actorId: "admin_1", paymentId: existing.id, providerRef: "HBL-BAD-01" },
            deps,
          ),
        (error) => {
          expectError(error, "INVALID_TRANSITION", /Cannot verify payment/i);
          return true;
        },
      );
      assert.equal(existing.status, "PENDING");
      assert.equal(row.status, status);
      assert.deepEqual(deps.bookingRepo.statusHistory, []);
    }
  });

  it("leaves an already TICKETING_PENDING booking in place after verify", async () => {
    const existing = paymentStub({ status: "PROCESSING", id: "pay_pending_ticket" });
    const { row, deps } = harness({
      booking: { status: "TICKETING_PENDING" },
      payments: [existing],
    });
    await verifyAdminPayment(
      { actorId: "admin_1", paymentId: "pay_pending_ticket", providerRef: "HBL-ALREADY" },
      deps,
    );
    assert.equal(existing.status, "PAID");
    assert.equal(row.status, "TICKETING_PENDING");
    assert.deepEqual(deps.bookingRepo.statusHistory, []);
  });

  it("is idempotent when the payment is already PAID", async () => {
    const existing = paymentStub({ status: "PAID", id: "pay_paid" });
    const { row, deps } = harness({
      booking: { status: "TICKETING_PENDING" },
      payments: [existing],
    });
    await assert.rejects(
      () =>
        verifyAdminPayment(
          { actorId: "admin_1", paymentId: "pay_paid", providerRef: "HBL-AGAIN" },
          deps,
        ),
      (error) => {
        expectError(error, "VALIDATION", /already finalized/i);
        return true;
      },
    );
    assert.equal(row.status, "TICKETING_PENDING");
  });

  it("keeps payments.verify on SUPER_ADMIN, ADMIN, and ACCOUNTANT only", () => {
    assert.equal(hasPermission("SUPER_ADMIN", "payments.verify"), true);
    assert.equal(hasPermission("ADMIN", "payments.verify"), true);
    assert.equal(hasPermission("ACCOUNTANT", "payments.verify"), true);
    for (const role of ["CUSTOMER", "MANAGER", "TICKET_ISSUER", "SUPPORT", "STAFF", "AGENT"] as const) {
      assert.equal(hasPermission(role, "payments.verify"), false);
    }
  });

  it("does not create a ticket or allow a second issuance after verify", async () => {
    const existing = paymentStub({ status: "AUTHORIZED", id: "pay_auth" });
    const { row, deps } = harness({
      booking: { status: "PAYMENT_RECEIVED" },
      payments: [existing],
    });
    await verifyAdminPayment(
      { actorId: "admin_1", paymentId: "pay_auth", providerRef: "HBL-ONE-STEP" },
      deps,
    );
    assert.deepEqual(deps.bookingRepo.statusHistory, ["TICKETING_PENDING"]);
    assert.equal(row.status, "TICKETING_PENDING");
    assert.equal(ticketAlreadyIssued(row.status, null), false);
    row.status = "CONFIRMED";
    row.supplierTicketingStatus = "ISSUED_MANUAL";
    assert.equal(ticketAlreadyIssued(row.status, row.supplierTicketingStatus), true);
    assert.equal(canIssueTicketFromStatus("CONFIRMED"), false);
  });
});

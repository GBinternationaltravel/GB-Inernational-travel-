/**
 * Non-destructive MOCK booking E2E QA.
 * Drives services/repositories directly (no HTTP session).
 * Never prints secrets. Never runs migrate reset.
 *
 * Usage: npx tsx --env-file=.env scripts/qa-booking-flow.ts
 */
import { randomBytes } from "crypto";
import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/db";
import { getPaymentEnv } from "../src/config/payment";
import { getPaymentProvider } from "../src/providers/registry";
import { signMockWebhook } from "../src/providers/payments/mock-payment-provider";
import {
  acceptBookingTerms,
  createOrUpdateBookingDraft,
} from "../src/services/booking-service";
import { searchFlights } from "../src/services/flight-service";
import { processPaymentWebhook } from "../src/services/payment-service";
import {
  getTicketIssuerMode,
  issueTicketManually,
} from "../src/services/ticket-issuer-service";
import { recordAdminPaymentRefund } from "../src/services/admin-payment-service";
import { AdminServiceError } from "../src/services/admin-booking-service";
import { getBookingRepository } from "../src/lib/booking/get-repository";
import { getPaymentRepository } from "../src/lib/payment/get-repository";

const QA_EMAIL = "qa-e2e@gbinternational.local";
const QA_NOTE = "QA-E2E";
const QA_PNR = "QAE2E1";
const results: Array<{ area: string; ok: boolean; detail: string }> = [];

function pass(area: string, detail: string) {
  results.push({ area, ok: true, detail });
  console.log(`PASS  [${area}] ${detail}`);
}

function fail(area: string, detail: string) {
  results.push({ area, ok: false, detail });
  console.error(`FAIL  [${area}] ${detail}`);
}

function assert(area: string, condition: boolean, detail: string) {
  if (condition) pass(area, detail);
  else fail(area, detail);
  return condition;
}

/** Force mock suppliers for this process only — does not mutate .env files. */
function forceMockProviders() {
  process.env.FLIGHT_SUPPLIER = "mock";
  process.env.PAYMENT_PROVIDER = "MOCK";
  process.env.MOCK_FLIGHT_NO_AVAILABILITY = "false";
  process.env.MOCK_FLIGHT_FORCE_EXPIRE = "false";
  process.env.MOCK_FLIGHT_PRICE_CHANGE = "false";
  process.env.MOCK_FLIGHT_TIMEOUT = "false";
}

async function ensureQaCustomer(): Promise<{ id: string; email: string; created: boolean }> {
  const existing = await prisma.user.findUnique({ where: { email: QA_EMAIL } });
  if (existing) {
    return { id: existing.id, email: existing.email, created: false };
  }

  // Random password hashed once; never logged or printed.
  const passwordHash = await hashPassword(`qa-${randomBytes(24).toString("hex")}`);
  const created = await prisma.user.create({
    data: {
      email: QA_EMAIL,
      passwordHash,
      firstName: "QA",
      lastName: "E2E",
      phone: "3000000099",
      phoneCountryCode: "+92",
      role: "CUSTOMER",
      isDemo: true,
      preferredCurrency: "PKR",
      preferredLanguage: "en",
    },
  });
  return { id: created.id, email: created.email, created: true };
}

async function resolveTicketActorId(fallbackUserId: string): Promise<string> {
  const staff = await prisma.user.findFirst({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN", "TICKET_ISSUER", "MANAGER"] },
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return staff?.id ?? fallbackUserId;
}

async function runMockPaymentSuccess(input: {
  bookingId: string;
  reference: string;
  amount: number;
  currency: string;
}): Promise<{ paymentId: string; webhookResult: string }> {
  const { repo: paymentRepo } = await getPaymentRepository();
  const { repo: bookingRepo } = await getBookingRepository();
  const provider = getPaymentProvider();

  if (!provider.isMock) {
    throw new Error(`Expected MOCK payment provider, got ${provider.code}`);
  }

  const idempotencyKey = `qa-e2e:${input.bookingId}:${Date.now()}`;
  const payment = await paymentRepo.createPayment({
    bookingId: input.bookingId,
    amount: input.amount,
    currency: input.currency,
    provider: provider.code,
    isMock: true,
    idempotencyKey,
    metadata: {
      bookingReference: input.reference,
      qa: QA_NOTE,
      note: "Created by scripts/qa-booking-flow.ts (no HTTP session)",
    },
  });

  const env = getPaymentEnv();
  const attemptKey = `${idempotencyKey}:attempt:1`;
  const returnUrl = `${env.appUrl}/booking/payment/return?paymentId=${encodeURIComponent(payment.id)}&ref=${encodeURIComponent(input.reference)}`;
  const cancelUrl = `${returnUrl}&status=cancelled`;
  const webhookUrl = `${env.appUrl}/api/payments/webhook/mock`;

  const checkout = await provider.createCheckout({
    paymentId: payment.id,
    attemptId: attemptKey,
    bookingReference: input.reference,
    amount: payment.amount,
    currency: payment.currency,
    customerEmail: QA_EMAIL,
    returnUrl,
    cancelUrl,
    webhookUrl,
    metadata: { bookingReference: input.reference, qa: QA_NOTE },
  });

  await paymentRepo.createAttempt({
    paymentId: payment.id,
    attemptNumber: 1,
    provider: provider.code,
    amount: payment.amount,
    currency: payment.currency,
    idempotencyKey: attemptKey,
    returnUrl,
    checkoutUrl: checkout.checkoutUrl,
    providerCheckoutId: checkout.providerCheckoutId,
    rawRequest: { amount: payment.amount, currency: payment.currency, qa: QA_NOTE },
    rawResponse: checkout.rawResponse,
    status: "REDIRECTED",
  });

  await paymentRepo.updatePayment(payment.id, {
    status: "PROCESSING",
    providerRef: checkout.providerCheckoutId,
  });
  await bookingRepo.updateStatus(input.bookingId, "PAYMENT_PROCESSING");

  // Same verified webhook path as emitMockPaymentWebhook, without session auth.
  const timestamp = new Date().toISOString();
  const payload = {
    eventId: `qa_e2e_wh_${payment.id}_${Date.now()}`,
    eventType: "payment.succeeded",
    paymentId: payment.id,
    providerPaymentRef: checkout.providerCheckoutId,
    status: "SUCCEEDED",
    amount: payment.amount,
    currency: payment.currency,
  };
  const rawBody = JSON.stringify(payload);
  const signature = signMockWebhook(env.mockWebhookSecret, timestamp, rawBody);
  const webhook = await processPaymentWebhook("MOCK", rawBody, {
    "x-gb-mock-signature": signature,
    "x-gb-mock-timestamp": timestamp,
    "content-type": "application/json",
  });

  return { paymentId: payment.id, webhookResult: webhook.result };
}

async function cleanupQaBooking(bookingId: string): Promise<void> {
  // Cascade deletes payments/attempts/tickets; leave QA user intact.
  await prisma.booking.delete({ where: { id: bookingId } }).catch(() => {
    /* already removed or never persisted */
  });
}

async function main() {
  forceMockProviders();
  let bookingId: string | null = null;
  let reference: string | null = null;

  console.log("=== QA BOOKING FLOW (MOCK) ===");
  console.log("Non-destructive: no migrate reset; QA booking only.\n");

  try {
    await prisma.$queryRaw`SELECT 1`;
    pass("DATABASE", "reachable");
  } catch (e) {
    fail("DATABASE", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
    return;
  }

  const bookingStore = process.env.BOOKING_STORE ?? "(unset)";
  const paymentStore = process.env.PAYMENT_STORE ?? "(unset)";
  if (bookingStore !== "prisma" || paymentStore !== "prisma") {
    fail(
      "DATA_STORES",
      `BOOKING_STORE=${bookingStore} PAYMENT_STORE=${paymentStore} (need prisma for DB stage checks)`,
    );
  } else {
    pass("DATA_STORES", "BOOKING_STORE=prisma PAYMENT_STORE=prisma");
  }

  // --- Refund helper exists (no refund executed on this booking) ---
  assert(
    "PAYMENT_REFUND_FN",
    typeof recordAdminPaymentRefund === "function",
    "recordAdminPaymentRefund is exported",
  );

  // --- LIVE issuer guard (do not mutate SiteSetting to LIVE) ---
  try {
    const mode = await getTicketIssuerMode();
    pass("TICKET_ISSUER_MODE", `current mode=${mode}`);
    if (mode === "LIVE") {
      fail(
        "TICKET_LIVE_GUARD",
        "SiteSetting already LIVE — refusing to run issuance against LIVE; expected throw FORBIDDEN_ACTION",
      );
    } else {
      pass(
        "TICKET_LIVE_GUARD",
        `skipped SiteSetting→LIVE (would break admin); expected issueTicketManually LIVE throw: FORBIDDEN_ACTION "LIVE ticket issuance is not configured..."`,
      );
    }
  } catch (e) {
    fail("TICKET_ISSUER_MODE", e instanceof Error ? e.message : String(e));
  }

  // --- QA customer ---
  let qaUser: { id: string; email: string; created: boolean };
  try {
    qaUser = await ensureQaCustomer();
    pass(
      "QA_USER",
      `${qaUser.created ? "created" : "reused"} email=${QA_EMAIL} id=${qaUser.id.slice(0, 8)}…`,
    );
  } catch (e) {
    fail("QA_USER", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
    return;
  }

  const departureDate = "2026-09-20";
  const searchInput = {
    tripType: "ONE_WAY" as const,
    origin: "KHI",
    destination: "DXB",
    departureDate,
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "ECONOMY" as const,
    currency: "PKR" as const,
  };

  // --- Search offers ---
  let offerId = "";
  try {
    const search = await searchFlights(searchInput);
    assert("SEARCH", search.offers.length > 0, `offers=${search.offers.length} supplier=${search.supplierCode} isMock=${search.isMock}`);
    if (!search.isMock) {
      fail("SEARCH_MOCK", `expected mock supplier, got isMock=${search.isMock} code=${search.supplierCode}`);
    } else {
      pass("SEARCH_MOCK", `supplier=${search.supplierCode}`);
    }
    const offer = search.offers[0];
    if (!offer) {
      fail("SEARCH", "no offer selected");
      process.exitCode = 1;
      return;
    }
    offerId = offer.id;
    pass("OFFER", `id=${offerId.slice(0, 24)}… total=${offer.totalPrice} ${offer.currency}`);
  } catch (e) {
    fail("SEARCH", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
    return;
  }

  // --- Draft + passengers ---
  let accessToken = "";
  try {
    const draft = await createOrUpdateBookingDraft(
      {
        offerId,
        tripType: "ONE_WAY",
        origin: "KHI",
        destination: "DXB",
        departureDate,
        cabinClass: "ECONOMY",
        adults: 1,
        children: 0,
        infants: 0,
        contact: {
          email: QA_EMAIL,
          phoneCountryCode: "+92",
          phone: "3000000099",
        },
        passengers: [
          {
            type: "ADULT",
            firstName: "Qa",
            lastName: "Traveler",
            dateOfBirth: "1990-05-15",
            gender: "OTHER",
            nationality: "PK",
            passportNumber: "QA1234567",
            passportIssuingCountry: "PK",
            passportExpiry: "2030-12-31",
          },
        ],
        specialRequests: QA_NOTE,
      },
      undefined,
      qaUser.id,
    );
    reference = draft.reference;
    accessToken = draft.accessToken;

    const dbDraft = await prisma.booking.findUnique({
      where: { reference },
      include: { bookingPassengers: true },
    });
    bookingId = dbDraft?.id ?? null;
    assert(
      "DRAFT_DB",
      Boolean(
        bookingId &&
          dbDraft &&
          dbDraft.status === "DRAFT" &&
          dbDraft.bookingPassengers.length === 1,
      ),
      `ref=${reference} status=${dbDraft?.status} passengers=${dbDraft?.bookingPassengers.length ?? 0}`,
    );
    assert(
      "DRAFT_NOTES",
      Boolean(dbDraft?.notes?.includes(QA_NOTE)),
      `notes marked ${QA_NOTE}`,
    );
    if (!bookingId) {
      fail("DRAFT", "booking id missing after draft create");
      process.exitCode = 1;
      return;
    }
  } catch (e) {
    fail("DRAFT", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
    return;
  }

  // --- Terms → PENDING_PAYMENT ---
  try {
    const afterTerms = await acceptBookingTerms(reference!, accessToken);
    const dbTerms = await prisma.booking.findUnique({ where: { id: bookingId! } });
    assert(
      "TERMS",
      afterTerms.status === "PENDING_PAYMENT" && dbTerms?.status === "PENDING_PAYMENT",
      `status=${dbTerms?.status} termsAt=${dbTerms?.termsAcceptedAt ? "set" : "missing"}`,
    );
  } catch (e) {
    fail("TERMS", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
    await cleanupQaBooking(bookingId!);
    return;
  }

  // --- Mock payment success → TICKETING_PENDING ---
  let paymentId = "";
  try {
    const dbBooking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId! } });
    const paid = await runMockPaymentSuccess({
      bookingId: dbBooking.id,
      reference: dbBooking.reference,
      amount: Number(dbBooking.totalAmount),
      currency: dbBooking.currency,
    });
    paymentId = paid.paymentId;

    const dbPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
    const dbAfterPay = await prisma.booking.findUnique({ where: { id: bookingId! } });
    assert(
      "PAYMENT_WEBHOOK",
      paid.webhookResult === "paid",
      `webhookResult=${paid.webhookResult}`,
    );
    assert(
      "PAYMENT_DB",
      dbPayment?.status === "PAID",
      `paymentStatus=${dbPayment?.status} isMock=${dbPayment?.isMock}`,
    );
    assert(
      "TICKETING_PENDING",
      dbAfterPay?.status === "TICKETING_PENDING",
      `bookingStatus=${dbAfterPay?.status} (payment success ≠ ticket)`,
    );
  } catch (e) {
    fail("PAYMENT", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
    await cleanupQaBooking(bookingId!);
    return;
  }

  // --- Manual ticket issue with PNR ---
  try {
    const actorId = await resolveTicketActorId(qaUser.id);
    const mode = await getTicketIssuerMode();
    if (mode === "LIVE") {
      fail("ISSUE_TICKET", "blocked: ticketIssuerMode is LIVE");
    } else {
      const issued = await issueTicketManually({
        actorId,
        bookingReference: reference!,
        pnr: QA_PNR,
        ticketNumbers: [`QA-${QA_PNR}-01`],
        notes: `${QA_NOTE} issued by qa-booking-flow`,
      });
      assert(
        "ISSUE_TICKET",
        issued.status === "CONFIRMED" && issued.pnr === QA_PNR,
        `status=${issued.status} pnr=${issued.pnr} mode=${issued.mode}`,
      );

      const dbBooking = await prisma.booking.findUnique({ where: { id: bookingId! } });
      const tickets = await prisma.ticket.findMany({ where: { bookingId: bookingId! } });
      assert(
        "TICKET_DB",
        dbBooking?.status === "CONFIRMED" && tickets.length >= 1,
        `status=${dbBooking?.status} ticketRows=${tickets.length} pnr=${tickets[0]?.pnr ?? "none"}`,
      );
    }
  } catch (e) {
    if (e instanceof AdminServiceError && e.code === "FORBIDDEN_ACTION") {
      fail("ISSUE_TICKET", `FORBIDDEN_ACTION: ${e.message}`);
    } else {
      fail("ISSUE_TICKET", e instanceof Error ? e.message : String(e));
    }
  }

  // Cancel is intentionally not one-click tested here.
  pass("CANCEL_SKIP", "cancel one-click path not exercised (by design)");

  // Cleanup: delete only this QA booking (cascade payments/tickets). Keep QA user.
  if (bookingId) {
    try {
      await cleanupQaBooking(bookingId);
      const gone = await prisma.booking.findUnique({ where: { id: bookingId } });
      assert("CLEANUP", gone === null, `deleted QA booking ${reference}; user ${QA_EMAIL} retained`);
    } catch (e) {
      fail("CLEANUP", e instanceof Error ? e.message : String(e));
      pass("CLEANUP_FALLBACK", `booking ${reference} left with notes ${QA_NOTE} paymentId=${paymentId ? "set" : "n/a"}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n=== QA BOOKING FLOW SUMMARY ===");
  console.log(`passed=${results.filter((r) => r.ok).length} failed=${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.area}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error("FAIL  [FATAL]", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

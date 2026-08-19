import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  TravelportFlightSupplier,
  clearTravelportOfferCache,
} from "@/providers/flights/travelport-flight-supplier";
import { clearTravelportTokenCache } from "@/providers/flights/travelport-auth";
import {
  buildTravelersListBody,
  extractLocator,
  normalizeSupplierLocator,
  stripPriceSuffix,
} from "@/providers/flights/travelport-booking";
import { redactForLogs } from "@/lib/booking/masking";
import { MockFlightSupplier } from "@/providers/flights/mock-flight-supplier";
import { buildIdempotencyKey } from "@/providers/flights/idempotency";
import {
  sanitizedWorkbenchCreateFixture,
  sanitizedTravelerAddFixture,
  sanitizedAddOfferFixture,
  sanitizedCommitSuccessFixture,
  sanitizedCommitPriceChangeFixture,
} from "@/providers/flights/__fixtures__/travelport-booking-sanitized";

function setTravelportEnv(opts: { enableBooking?: boolean } = {}) {
  process.env.FLIGHT_SUPPLIER = "travelport";
  process.env.TRAVELPORT_ENVIRONMENT = "sandbox";
  process.env.TRAVELPORT_CLIENT_ID = "test-client";
  process.env.TRAVELPORT_CLIENT_SECRET = "test-secret";
  process.env.TRAVELPORT_USERNAME = "test-user";
  process.env.TRAVELPORT_PASSWORD = "test-pass";
  process.env.TRAVELPORT_ACCESS_GROUP = "access-group";
  process.env.TRAVELPORT_ENABLE_SANDBOX_BOOKING = opts.enableBooking
    ? "true"
    : "false";
}

function clearTravelportEnv() {
  for (const key of [
    "TRAVELPORT_CLIENT_ID",
    "TRAVELPORT_CLIENT_SECRET",
    "TRAVELPORT_USERNAME",
    "TRAVELPORT_PASSWORD",
    "TRAVELPORT_ACCESS_GROUP",
    "TRAVELPORT_PCC",
    "TRAVELPORT_ENABLE_SANDBOX_BOOKING",
    "TRAVELPORT_ENABLE_SANDBOX_TICKETING",
  ]) {
    delete process.env[key];
  }
  process.env.FLIGHT_SUPPLIER = "mock";
}

function mockFetchSequence(
  handlers: Array<(url: string, init?: RequestInit) => Promise<Response> | Response>,
) {
  let index = 0;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const handler = handlers[index++];
    if (!handler) throw new Error(`Unexpected fetch: ${url}`);
    return handler(url, init);
  };
}

const sessionRef = JSON.stringify({
  catalogOfferingsId: "catalog-1",
  catalogProductOfferingId: "cpo-1",
  productIds: ["prod-1"],
  priceTransactionId: "price-1_PC",
  environment: "sandbox",
});

const bookingInput = {
  idempotencyKey: "tp-book-test-1",
  internalOfferId: "tp-cpo-1-prod-1",
  supplierOfferId: "cpo-1",
  supplierCode: "TRAVELPORT",
  supplierSessionRef: sessionRef,
  contactEmail: "guest@example.com",
  contactPhone: "+923001234567",
  expectedTotal: 125000,
  currency: "PKR",
  passengers: [
    {
      type: "ADULT" as const,
      firstName: "Test",
      lastName: "Traveler",
      dateOfBirth: "1990-01-15",
      gender: "MALE" as const,
      nationality: "PK",
      hasTravelDocument: true,
      travelDocument: {
        number: "AB1234567",
        issuingCountry: "PK",
        expiry: "2030-01-01",
      },
    },
  ],
};

describe("Phase 7D Travelport booking workflow", () => {
  beforeEach(() => {
    clearTravelportOfferCache();
    clearTravelportTokenCache();
    setTravelportEnv({ enableBooking: false });
  });

  afterEach(() => {
    clearTravelportEnv();
    clearTravelportOfferCache();
    clearTravelportTokenCache();
  });

  it("initializes booking adapter", () => {
    const supplier = new TravelportFlightSupplier();
    assert.equal(supplier.code, "TRAVELPORT");
    assert.equal(typeof supplier.createBooking, "function");
  });

  it("returns NOT_CONFIGURED when credentials missing", async () => {
    clearTravelportEnv();
    process.env.FLIGHT_SUPPLIER = "travelport";
    process.env.TRAVELPORT_ENABLE_SANDBOX_BOOKING = "true";
    const supplier = new TravelportFlightSupplier();
    const result = await supplier.createBooking(bookingInput);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "NOT_CONFIGURED");
  });

  it("returns NOT_CONFIGURED when sandbox booking disabled", async () => {
    setTravelportEnv({ enableBooking: false });
    const supplier = new TravelportFlightSupplier();
    const result = await supplier.createBooking({
      ...bookingInput,
      idempotencyKey: buildIdempotencyKey(["disabled", String(Date.now())]),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "NOT_CONFIGURED");
  });

  it("maps travelers without logging documents", () => {
    const body = buildTravelersListBody(bookingInput);
    const traveler = body.TravelerListRequest.Traveler[0]!;
    assert.equal(traveler.passengerTypeCode, "ADT");
    assert.ok(traveler.TravelDocument);
    const redacted = redactForLogs({
      passengers: bookingInput.passengers,
      travelDocument: bookingInput.passengers[0]!.travelDocument,
      docNumber: "AB1234567",
    });
    assert.equal(redacted.docNumber, "[REDACTED]");
    assert.equal(redacted.travelDocument, "[REDACTED]");
  });

  it("strips AirPrice _PC suffix for Add Offer", () => {
    assert.equal(stripPriceSuffix("abc_PC"), "abc");
    assert.equal(stripPriceSuffix("abc"), "abc");
  });

  it("normalizes commit locator from sanitized fixture", () => {
    const extracted = extractLocator(sanitizedCommitSuccessFixture);
    assert.equal(extracted.locator, "AB12CD");
    assert.equal(extracted.status, "HELD");
  });

  it("detects price-change commit without locator", () => {
    const extracted = extractLocator(sanitizedCommitPriceChangeFixture);
    assert.equal(extracted.locator, null);
    assert.equal(extracted.priceChanged, true);
  });

  it("runs workbench → travelers → offer → commit when enabled", async () => {
    setTravelportEnv({ enableBooking: true });
    const calls: string[] = [];
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), {
          status: 200,
        }),
      async (url) => {
        calls.push("workbench");
        assert.match(url, /book\/session\/reservationworkbench/);
        return new Response(JSON.stringify(sanitizedWorkbenchCreateFixture), {
          status: 200,
        });
      },
      async (url) => {
        calls.push("travelers");
        assert.match(url, /travelers\/list/);
        return new Response(JSON.stringify(sanitizedTravelerAddFixture), {
          status: 200,
        });
      },
      async (url) => {
        calls.push("offer");
        assert.match(url, /offers\/buildfromcatalogproductofferings/);
        return new Response(JSON.stringify(sanitizedAddOfferFixture), {
          status: 200,
        });
      },
      async (url) => {
        calls.push("commit");
        assert.match(url, /book\/reservation\/reservations\//);
        return new Response(JSON.stringify(sanitizedCommitSuccessFixture), {
          status: 200,
        });
      },
    ]);

    const supplier = new TravelportFlightSupplier({
      fetchImpl: fetchImpl as typeof fetch,
    });
    const result = await supplier.createBooking({
      ...bookingInput,
      idempotencyKey: buildIdempotencyKey(["book-ok", String(Date.now())]),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.supplierBookingRef, "AB12CD");
      assert.equal(result.supplierBookingStatus, "HELD");
      assert.equal(result.ticketingStatus, "NOT_TICKETED");
      assert.ok(result.supplierBookingId);
    }
    assert.deepEqual(calls, ["workbench", "travelers", "offer", "commit"]);
  });

  it("returns PRICE_CHANGED when commit warns without locator", async () => {
    setTravelportEnv({ enableBooking: true });
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), {
          status: 200,
        }),
      async () =>
        new Response(JSON.stringify(sanitizedWorkbenchCreateFixture), { status: 200 }),
      async () =>
        new Response(JSON.stringify(sanitizedTravelerAddFixture), { status: 200 }),
      async () =>
        new Response(JSON.stringify(sanitizedAddOfferFixture), { status: 200 }),
      async () =>
        new Response(JSON.stringify(sanitizedCommitPriceChangeFixture), {
          status: 200,
        }),
    ]);
    const supplier = new TravelportFlightSupplier({
      fetchImpl: fetchImpl as typeof fetch,
    });
    const result = await supplier.createBooking({
      ...bookingInput,
      idempotencyKey: buildIdempotencyKey(["book-price", String(Date.now())]),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "PRICE_CHANGED");
  });

  it("does not retry on commit timeout", async () => {
    setTravelportEnv({ enableBooking: true });
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), {
          status: 200,
        }),
      async () =>
        new Response(JSON.stringify(sanitizedWorkbenchCreateFixture), { status: 200 }),
      async () =>
        new Response(JSON.stringify(sanitizedTravelerAddFixture), { status: 200 }),
      async () =>
        new Response(JSON.stringify(sanitizedAddOfferFixture), { status: 200 }),
      async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      },
    ]);
    const supplier = new TravelportFlightSupplier({
      fetchImpl: fetchImpl as typeof fetch,
    });
    const result = await supplier.createBooking({
      ...bookingInput,
      idempotencyKey: buildIdempotencyKey(["book-timeout", String(Date.now())]),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "BOOKING_FAILED");
      assert.ok(result.workbenchId);
      assert.match(result.message, /not retried/i);
    }
  });

  it("protects duplicate booking with idempotency", async () => {
    setTravelportEnv({ enableBooking: true });
    let commits = 0;
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), {
          status: 200,
        }),
      async () =>
        new Response(JSON.stringify(sanitizedWorkbenchCreateFixture), { status: 200 }),
      async () =>
        new Response(JSON.stringify(sanitizedTravelerAddFixture), { status: 200 }),
      async () =>
        new Response(JSON.stringify(sanitizedAddOfferFixture), { status: 200 }),
      async () => {
        commits += 1;
        return new Response(JSON.stringify(sanitizedCommitSuccessFixture), {
          status: 200,
        });
      },
    ]);
    const supplier = new TravelportFlightSupplier({
      fetchImpl: fetchImpl as typeof fetch,
    });
    const key = buildIdempotencyKey(["book-idem", String(Date.now())]);
    const first = await supplier.createBooking({ ...bookingInput, idempotencyKey: key });
    const second = await supplier.createBooking({ ...bookingInput, idempotencyKey: key });
    assert.deepEqual(first, second);
    assert.equal(commits, 1);
  });

  it("rejects fabricated or empty locators", () => {
    assert.equal(normalizeSupplierLocator("FAKE"), null);
    assert.equal(normalizeSupplierLocator("MOCK"), null);
    assert.equal(normalizeSupplierLocator(""), null);
    assert.equal(normalizeSupplierLocator("AB12CD"), "AB12CD");
    assert.equal(extractLocator({ Receipt: [{ Confirmation: { Locator: "NONE" } }] }).locator, null);
  });

  it("resolves locator via retrieve after commit timeout without creating a new booking", async () => {
    setTravelportEnv({ enableBooking: true });
    let workbenchCreates = 0;
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), {
          status: 200,
        }),
      async () => {
        workbenchCreates += 1;
        return new Response(JSON.stringify(sanitizedWorkbenchCreateFixture), {
          status: 200,
        });
      },
      async () =>
        new Response(JSON.stringify(sanitizedTravelerAddFixture), { status: 200 }),
      async () =>
        new Response(JSON.stringify(sanitizedAddOfferFixture), { status: 200 }),
      async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      },
      // Safe retrieve after timeout
      async (url) => {
        assert.match(url, /book\/reservation\/reservations\//);
        return new Response(JSON.stringify(sanitizedCommitSuccessFixture), {
          status: 200,
        });
      },
    ]);
    const supplier = new TravelportFlightSupplier({
      fetchImpl: fetchImpl as typeof fetch,
    });
    const result = await supplier.createBooking({
      ...bookingInput,
      idempotencyKey: buildIdempotencyKey(["book-timeout-resolve", String(Date.now())]),
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.supplierBookingRef, "AB12CD");
    assert.equal(workbenchCreates, 1);
  });

  it("never stores a booking reference when commit has no locator", async () => {
    setTravelportEnv({ enableBooking: true });
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), {
          status: 200,
        }),
      async () =>
        new Response(JSON.stringify(sanitizedWorkbenchCreateFixture), { status: 200 }),
      async () =>
        new Response(JSON.stringify(sanitizedTravelerAddFixture), { status: 200 }),
      async () =>
        new Response(JSON.stringify(sanitizedAddOfferFixture), { status: 200 }),
      async () =>
        new Response(JSON.stringify({ ReservationResponse: { Reservation: {} } }), {
          status: 200,
        }),
    ]);
    const supplier = new TravelportFlightSupplier({
      fetchImpl: fetchImpl as typeof fetch,
    });
    const result = await supplier.createBooking({
      ...bookingInput,
      idempotencyKey: buildIdempotencyKey(["book-no-locator", String(Date.now())]),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "BOOKING_FAILED");
      assert.equal(
        "supplierBookingRef" in result ? (result as { supplierBookingRef?: string }).supplierBookingRef : undefined,
        undefined,
      );
    }
  });

  it("keeps mock booking NOT_CONFIGURED", async () => {
    const mock = new MockFlightSupplier();
    const result = await mock.createBooking({
      ...bookingInput,
      idempotencyKey: buildIdempotencyKey(["mock-book", String(Date.now())]),
      supplierCode: "MOCK",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "NOT_CONFIGURED");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UserRole } from "@prisma/client";
import { hasPermission } from "@/lib/auth/permissions";
import type { AuditLogInput } from "@/lib/security/audit";
import type { SafeBookingView } from "@/types/booking";
import type { FlightOffer } from "@/types/flight";
import {
  findForbiddenAdminPriceKeys,
  adminCreateBookingSchema,
  adminInventorySearchSchema,
} from "@/lib/validations/admin-booking";
import {
  createAdminBooking,
  searchAdminInventory,
} from "@/services/admin-create-booking-service";
import { AdminServiceError } from "@/services/admin-booking-service";

function offer(overrides: Partial<FlightOffer> & { from: string; to: string }): FlightOffer {
  const fromCountry = overrides.from === "DXB" ? "United Arab Emirates" : "Pakistan";
  const toCountry = overrides.to === "DXB" ? "United Arab Emirates" : "Pakistan";
  return {
    id: overrides.id ?? `${overrides.from}-${overrides.to}`,
    providerCode: "INVENTORY",
    supplierCode: "INVENTORY",
    supplierOfferId: overrides.id ?? `${overrides.from}-${overrides.to}`,
    isMock: false,
    airlineId: "pk",
    tripType: "ONE_WAY",
    cabinClass: "ECONOMY",
    currency: "PKR",
    totalPrice: overrides.totalPrice ?? 25_000,
    taxes: 3_000,
    baseFare: 22_000,
    pricedPassengers: { adults: 1, children: 0, infants: 0 },
    segments: [
      {
        origin: {
          iataCode: overrides.from,
          name: `${overrides.from} Airport`,
          city: overrides.from,
          country: fromCountry,
        },
        destination: {
          iataCode: overrides.to,
          name: `${overrides.to} Airport`,
          city: overrides.to,
          country: toCountry,
        },
        departureAt: "2026-11-20T05:00:00.000Z",
        arrivalAt: "2026-11-20T07:00:00.000Z",
        durationMinutes: 120,
        flightNumber: "PK100",
        airline: { iataCode: "PK", name: "PIA" },
      },
    ],
    stops: 0,
    durationMinutes: 120,
    baggageKg: 20,
    baggageIncluded: true,
    refundable: false,
    ...overrides,
  };
}

function adult(overrides: Record<string, unknown> = {}) {
  return {
    type: "ADULT" as const,
    firstName: "Ali",
    lastName: "Ahmed",
    dateOfBirth: "1990-01-01",
    gender: "MALE" as const,
    nationality: "PK",
    passportNumber: "AB1234567",
    passportIssuingCountry: "PK",
    passportExpiry: "2030-06-01",
    ...overrides,
  };
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    channel: "PHONE",
    termsAccepted: true,
    offerId: "ISB-KHI",
    tripType: "ONE_WAY",
    origin: "ISB",
    destination: "KHI",
    departureDate: "2026-11-20",
    cabinClass: "ECONOMY",
    adults: 1,
    children: 0,
    infants: 0,
    contact: {
      email: "guest@example.com",
      phoneCountryCode: "+92",
      phone: "3001234567",
    },
    passengers: [adult()],
    ...overrides,
  };
}

function safeView(overrides: Partial<SafeBookingView> = {}): SafeBookingView {
  return {
    reference: "GBTEST001",
    status: "PENDING_PAYMENT",
    currency: "PKR",
    subtotalAmount: 22_000,
    taxesAmount: 3_000,
    feesAmount: 1_000,
    totalAmount: 26_000,
    contactEmailMasked: "g***@example.com",
    contactPhoneMasked: "+92****4567",
    termsAccepted: true,
    expiresAt: null,
    store: "file",
    offer: {
      origin: "ISB",
      destination: "KHI",
      originCity: "Islamabad",
      destinationCity: "Karachi",
      departureAt: "2026-11-20T05:00:00.000Z",
      arrivalAt: "2026-11-20T07:00:00.000Z",
      airlineName: "PIA",
      flightNumber: "PK100",
      cabinClass: "ECONOMY",
      baggageKg: 20,
      stops: 0,
      durationMinutes: 120,
      isMock: false,
      offerId: "ISB-KHI",
      internalOfferId: "ISB-KHI",
      supplierCode: "INVENTORY",
      supplierOfferId: "ISB-KHI",
      supplierSessionRef: null,
      expiresAt: null,
      providerCode: "INVENTORY",
      airlineId: "pk",
      refundable: false,
      baggageIncluded: true,
      supplierFare: 25_000,
      baseFare: 22_000,
      taxes: 3_000,
      pricing: {
        currency: "PKR",
        baseFare: 22_000,
        taxes: 3_000,
        fees: 1_000,
        supplierFare: 25_000,
        markupRate: 0,
        total: 26_000,
        isMock: false,
        notice: "test",
      },
    },
    passengers: [],
    pricingNotice: "test",
    supplier: {
      supplierCode: "INVENTORY",
      supplierBookingRef: null,
      supplierBookingStatus: null,
      supplierTicketingStatus: null,
      priceStatus: "Verified",
      environment: null,
    },
    ...overrides,
  };
}

const outboundOffer = offer({ from: "ISB", to: "KHI", id: "ISB-KHI" });
const inboundOffer = offer({ from: "KHI", to: "ISB", id: "KHI-ISB", totalPrice: 24_000 });

function deps(audits: AuditLogInput[] = [], userIdSeen: Array<string | null | undefined> = []) {
  return {
    getOffer: async (id: string) => {
      if (id === outboundOffer.id) return outboundOffer;
      if (id === inboundOffer.id) return inboundOffer;
      return null;
    },
    revalidate: async () => ({
      ok: true,
      status: "VALID" as const,
      offer: outboundOffer,
      message: "ok",
      isMock: false,
    }),
    createDraft: async (_raw: unknown, _existing: unknown, userId?: string | null) => {
      userIdSeen.push(userId ?? null);
      return {
        booking: safeView({ status: "DRAFT", termsAccepted: false }),
        accessToken: "token",
        reference: "GBTEST001",
      };
    },
    acceptTerms: async () => safeView(),
    writeAudit: async (entry: AuditLogInput) => {
      audits.push(entry);
    },
    getUsers: async () => ({
      kind: "file" as const,
      repo: {
        findByEmail: async () => null,
      },
    }),
    search: async () => ({
      offers: [outboundOffer],
      searchedAt: new Date().toISOString(),
      providerCode: "INVENTORY",
      supplierCode: "INVENTORY",
      isMock: false,
    }),
  };
}

describe("bookings.create permission", () => {
  const allowed: UserRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "SUPPORT"];
  const denied: UserRole[] = ["CUSTOMER", "ACCOUNTANT", "AGENT", "TICKET_ISSUER"];

  it("is granted only to the approved staff roles", () => {
    for (const role of allowed) {
      assert.equal(hasPermission(role, "bookings.create"), true, role);
    }
    for (const role of denied) {
      assert.equal(hasPermission(role, "bookings.create"), false, role);
    }
  });

  it("does not replace bookings.view or bookings.status", () => {
    assert.equal(hasPermission("AGENT", "bookings.view"), true);
    assert.equal(hasPermission("AGENT", "bookings.create"), false);
    assert.equal(hasPermission("TICKET_ISSUER", "bookings.view"), true);
    assert.equal(hasPermission("TICKET_ISSUER", "bookings.create"), false);
    assert.equal(hasPermission("ACCOUNTANT", "payments.verify"), true);
    assert.equal(hasPermission("ACCOUNTANT", "bookings.create"), false);
  });
});

describe("admin create booking validation", () => {
  it("rejects MULTI_CITY", () => {
    const parsed = adminCreateBookingSchema.safeParse(
      payload({ tripType: "MULTI_CITY", returnOfferId: "x" }),
    );
    assert.equal(parsed.success, false);
  });

  it("rejects search MULTI_CITY", () => {
    const parsed = adminInventorySearchSchema.safeParse({
      tripType: "MULTI_CITY",
      origin: "ISB",
      destination: "KHI",
      departureDate: "2026-11-20",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
    });
    assert.equal(parsed.success, false);
  });

  it("detects client-supplied totals", () => {
    assert.deepEqual(findForbiddenAdminPriceKeys({ total: 1 }), ["total"]);
    assert.deepEqual(findForbiddenAdminPriceKeys({ offerSnapshot: {}, taxesAmount: 2 }), [
      "taxesAmount",
      "offerSnapshot",
    ]);
    for (const key of [
      "totalAmount",
      "supplierFare",
      "agencyMarkup",
      "offerSnapshot",
      "supplierTotal",
      "markupAmount",
      "finalAmount",
    ]) {
      assert.deepEqual(findForbiddenAdminPriceKeys({ [key]: 1 }), [key]);
    }
    assert.deepEqual(findForbiddenAdminPriceKeys(payload()), []);
  });

  it("requires a return offer for round trips", () => {
    const parsed = adminCreateBookingSchema.safeParse(
      payload({
        tripType: "ROUND_TRIP",
        returnDate: "2026-11-27",
      }),
    );
    assert.equal(parsed.success, false);
  });
});

describe("createAdminBooking", () => {
  it("refuses roles without bookings.create", async () => {
    await assert.rejects(
      () => createAdminBooking({ actorId: "acc-1", actorRole: "ACCOUNTANT" }, payload(), deps()),
      (error: unknown) =>
        error instanceof AdminServiceError && error.code === "FORBIDDEN_ACTION",
    );
  });

  it("creates via the existing draft + acceptTerms path and never stores staff as userId", async () => {
    const audits: AuditLogInput[] = [];
    const userIds: Array<string | null | undefined> = [];
    const result = await createAdminBooking(
      { actorId: "staff-1", actorRole: "ADMIN" },
      payload(),
      deps(audits, userIds),
    );

    assert.equal(result.status, "PENDING_PAYMENT");
    assert.equal(result.reference, "GBTEST001");
    assert.equal(result.customerUserId, null);
    assert.deepEqual(userIds, [null]);
    assert.equal(audits[0]?.userId, "staff-1");
    assert.equal(audits[0]?.action, "ADMIN_BOOKING_CREATED");
    assert.equal((audits[0]?.metadata as { channel?: string })?.channel, "PHONE");
    assert.equal((audits[0]?.metadata as { customerUserId?: string | null })?.customerUserId, null);
  });

  it("rejects a client-supplied total before create", async () => {
    for (const key of [
      "totalAmount",
      "supplierFare",
      "agencyMarkup",
      "offerSnapshot",
      "supplierTotal",
      "markupAmount",
      "finalAmount",
    ]) {
      await assert.rejects(
        () =>
          createAdminBooking(
            { actorId: "staff-1", actorRole: "STAFF" },
            { ...payload(), [key]: 1 },
            deps(),
          ),
        (error: unknown) =>
          error instanceof AdminServiceError &&
          error.code === "VALIDATION" &&
          /calculated on the server/i.test(error.message),
        key,
      );
    }
  });

  it("links only an active CUSTOMER account, never the staff actor", async () => {
    const userIds: Array<string | null | undefined> = [];
    const result = await createAdminBooking(
      { actorId: "staff-1", actorRole: "MANAGER" },
      payload({ linkExistingCustomer: true, contact: { email: "staff@example.com", phoneCountryCode: "+92", phone: "3001234567" } }),
      {
        ...deps([], userIds),
        getUsers: async () => ({
          kind: "file" as const,
          repo: {
            findByEmail: async () => ({
              id: "staff-1",
              email: "staff@example.com",
              role: "ADMIN" as const,
              isActive: true,
            }),
          },
        }),
      },
    );
    assert.equal(result.customerUserId, null);
    assert.deepEqual(userIds, [null]);
  });

  it("links an existing active customer when requested", async () => {
    const userIds: Array<string | null | undefined> = [];
    const audits: AuditLogInput[] = [];
    const result = await createAdminBooking(
      { actorId: "staff-1", actorRole: "SUPPORT" },
      payload({ linkExistingCustomer: true }),
      {
        ...deps(audits, userIds),
        getUsers: async () => ({
          kind: "file" as const,
          repo: {
            findByEmail: async () => ({
              id: "cust-9",
              email: "guest@example.com",
              role: "CUSTOMER" as const,
              isActive: true,
            }),
          },
        }),
      },
    );
    assert.equal(result.customerUserId, "cust-9");
    assert.deepEqual(userIds, ["cust-9"]);
    assert.equal((audits[0]?.metadata as { customerUserId?: string })?.customerUserId, "cust-9");
  });

  it("creates a round trip from outbound + return offer ids", async () => {
    const result = await createAdminBooking(
      { actorId: "staff-1", actorRole: "ADMIN" },
      payload({
        tripType: "ROUND_TRIP",
        returnDate: "2026-11-27",
        returnOfferId: "KHI-ISB",
        channel: "WHATSAPP",
      }),
      {
        ...deps(),
        revalidate: async (input) => ({
          ok: true,
          status: "VALID" as const,
          offer: input.internalOfferId === "KHI-ISB" ? inboundOffer : outboundOffer,
          message: "ok",
          isMock: false,
        }),
        writeAudit: async (entry) => {
          assert.equal((entry.metadata as { channel?: string })?.channel, "WHATSAPP");
          assert.equal((entry.metadata as { tripType?: string })?.tripType, "ROUND_TRIP");
        },
      },
    );
    assert.equal(result.status, "PENDING_PAYMENT");
    assert.equal(result.channel, "WHATSAPP");
  });
});

describe("searchAdminInventory", () => {
  it("rejects roles without bookings.create", async () => {
    await assert.rejects(
      () =>
        searchAdminInventory(
          { actorId: "agent-1", actorRole: "AGENT" },
          {
            tripType: "ONE_WAY",
            origin: "ISB",
            destination: "KHI",
            departureDate: "2026-11-20",
            adults: 1,
            children: 0,
            infants: 0,
            cabinClass: "ECONOMY",
          },
          deps(),
        ),
      (error: unknown) =>
        error instanceof AdminServiceError && error.code === "FORBIDDEN_ACTION",
    );
  });
});

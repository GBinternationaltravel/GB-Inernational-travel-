import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { MockFlightSupplier } from "@/providers/flights/mock-flight-supplier";
import { SupplierError } from "@/providers/flights/supplier-errors";
import { withIdempotency, buildIdempotencyKey } from "@/providers/flights/idempotency";
import { setFlightSupplier } from "@/providers/registry";
import { searchFlights, revalidateFlightOffer } from "@/services/flight-service";
import { getSupplierTicketingService } from "@/services/supplier-ticketing-service";

describe("Phase 7A supplier abstraction", () => {
  beforeEach(() => {
    process.env.MOCK_FLIGHT_NO_AVAILABILITY = "false";
    process.env.MOCK_FLIGHT_FORCE_EXPIRE = "false";
    process.env.MOCK_FLIGHT_PRICE_CHANGE = "false";
    process.env.MOCK_FLIGHT_TIMEOUT = "false";
    setFlightSupplier(new MockFlightSupplier());
  });

  it("searches through supplier abstraction", async () => {
    const supplier = new MockFlightSupplier();
    const result = await supplier.searchFlights({
      origin: "ISB",
      destination: "DXB",
      departureDate: "2026-09-01",
      tripType: "ONE_WAY",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    assert.equal(result.supplierCode, "MOCK");
    assert.equal(result.isMock, true);
    assert.ok(result.offers.length > 0);
  });

  it("normalizes offer IDs separately", async () => {
    const supplier = new MockFlightSupplier();
    const result = await supplier.searchFlights({
      origin: "LHE",
      destination: "DXB",
      departureDate: "2026-09-02",
      tripType: "ONE_WAY",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    const offer = result.offers[0]!;
    assert.ok(offer.id);
    assert.ok(offer.supplierOfferId);
    assert.equal(offer.supplierCode, "MOCK");
    assert.ok(offer.expiresAt);
  });

  it("mock search via flight service", async () => {
    const result = await searchFlights({
      tripType: "ONE_WAY",
      origin: "KHI",
      destination: "DXB",
      departureDate: "2026-09-03",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    assert.equal(result.isMock, true);
    assert.equal(result.supplierCode, "MOCK");
  });

  it("simulates no availability", async () => {
    process.env.MOCK_FLIGHT_NO_AVAILABILITY = "true";
    setFlightSupplier(new MockFlightSupplier());
    const result = await searchFlights({
      tripType: "ONE_WAY",
      origin: "ISB",
      destination: "DXB",
      departureDate: "2026-09-04",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    assert.equal(result.offers.length, 0);
  });

  it("revalidates successfully", async () => {
    const search = await searchFlights({
      tripType: "ONE_WAY",
      origin: "ISB",
      destination: "DXB",
      departureDate: "2026-09-05",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    const offer = search.offers[0]!;
    const result = await revalidateFlightOffer({
      internalOfferId: offer.id,
      supplierOfferId: offer.supplierOfferId,
      supplierCode: offer.supplierCode,
      expectedTotal: offer.totalPrice,
    });
    assert.equal(result.ok, true);
    assert.equal(result.status, "VALID");
    assert.equal(result.isMock, true);
  });

  it("simulates offer expiration", async () => {
    process.env.MOCK_FLIGHT_FORCE_EXPIRE = "true";
    setFlightSupplier(new MockFlightSupplier());
    const search = await searchFlights({
      tripType: "ONE_WAY",
      origin: "ISB",
      destination: "DXB",
      departureDate: "2026-09-06",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    const offer = search.offers[0]!;
    const result = await revalidateFlightOffer({
      internalOfferId: offer.id,
      supplierOfferId: offer.supplierOfferId,
      supplierCode: offer.supplierCode,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, "EXPIRED");
  });

  it("simulates price change", async () => {
    process.env.MOCK_FLIGHT_PRICE_CHANGE = "true";
    setFlightSupplier(new MockFlightSupplier());
    const search = await searchFlights({
      tripType: "ONE_WAY",
      origin: "ISB",
      destination: "DXB",
      departureDate: "2026-09-07",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    const offer = search.offers[0]!;
    const result = await revalidateFlightOffer({
      internalOfferId: offer.id,
      supplierOfferId: offer.supplierOfferId,
      supplierCode: offer.supplierCode,
      expectedTotal: offer.totalPrice,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, "PRICE_CHANGED");
    assert.ok((result.currentTotal ?? 0) > offer.totalPrice);
  });

  it("simulates supplier timeout", async () => {
    process.env.MOCK_FLIGHT_TIMEOUT = "true";
    const supplier = new MockFlightSupplier();
    await assert.rejects(
      () =>
        supplier.searchFlights({
          origin: "ISB",
          destination: "DXB",
          departureDate: "2026-09-08",
          tripType: "ONE_WAY",
          adults: 1,
          children: 0,
          infants: 0,
          cabinClass: "ECONOMY",
          currency: "PKR",
        }),
      (error: unknown) => error instanceof SupplierError && error.code === "SUPPLIER_TIMEOUT",
    );
  });

  it("booking unsupported / not configured", async () => {
    const supplier = new MockFlightSupplier();
    const result = await supplier.createBooking({
      idempotencyKey: "test-booking-1",
      internalOfferId: "mock-x",
      supplierOfferId: "sup-x",
      supplierCode: "MOCK",
      contactEmail: "test@example.com",
      passengers: [
        {
          type: "ADULT",
          firstName: "Test",
          lastName: "User",
          hasTravelDocument: true,
        },
      ],
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "NOT_CONFIGURED");
  });

  it("ticketing unsupported / not configured", async () => {
    const ticketing = getSupplierTicketingService();
    const result = await ticketing.issueTicket({
      bookingReference: "GBTEST",
      bookingId: "id-1",
    });
    assert.equal(result.success, false);
    assert.equal(result.confirmed, false);
    assert.equal(result.code, "NOT_CONFIGURED");
  });

  it("idempotency does not duplicate work", async () => {
    let runs = 0;
    const key = buildIdempotencyKey(["test", "idem", String(Date.now())]);
    const first = await withIdempotency(key, "test", async () => {
      runs += 1;
      return { value: 1 };
    });
    const second = await withIdempotency(key, "test", async () => {
      runs += 1;
      return { value: 2 };
    });
    assert.equal(first.replayed, false);
    assert.equal(second.replayed, true);
    assert.equal(runs, 1);
    assert.deepEqual(second.result, { value: 1 });
  });

  it("reports healthy mock supplier", async () => {
    const health = await new MockFlightSupplier().getHealthStatus();
    assert.equal(health.available, true);
    assert.equal(health.isMock, true);
    assert.equal(health.configured, true);
  });
});

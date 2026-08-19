import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  TravelportFlightSupplier,
  clearTravelportOfferCache,
} from "@/providers/flights/travelport-flight-supplier";
import { clearTravelportTokenCache } from "@/providers/flights/travelport-auth";
import {
  normalizeTravelportSearchResponse,
  normalizeTravelportPriceResponse,
} from "@/providers/flights/travelport-normalize";
import { buildTravelportSearchRequest } from "@/providers/flights/travelport-request-builders";
import { MockFlightSupplier } from "@/providers/flights/mock-flight-supplier";
import { SupplierError } from "@/providers/flights/supplier-errors";
import { withIdempotency, buildIdempotencyKey } from "@/providers/flights/idempotency";
import { setFlightSupplier } from "@/providers/registry";
import { getFlightSupplierEnv } from "@/config/flight-supplier";
import {
  sanitizedTravelportSearchFixture,
  sanitizedTravelportPriceValidFixture,
  sanitizedTravelportPriceChangedFixture,
} from "@/providers/flights/__fixtures__/travelport-sanitized-responses";

const SAMPLE_SEARCH = {
  CatalogProductOfferingsResponse: {
    CatalogProductOfferings: {
      Identifier: { value: "catalog-offerings-1" },
      CatalogProductOffering: [
        {
          id: "cpo-1",
          ProductBrandOptions: [
            {
              ProductBrandOffering: [
                {
                  Brand: "Economy Flex",
                  Price: {
                    TotalPrice: 85000,
                    CurrencyCode: "PKR",
                    Base: 72000,
                    TotalTaxes: 13000,
                  },
                  Product: [
                    {
                      id: "prod-1",
                      FlightRef: ["flt-1", "flt-2"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      ReferenceList: {
        Flight: [
          {
            id: "flt-1",
            Carrier: "PK",
            number: "301",
            Departure: { location: "ISB", date: "2026-09-01", time: "08:00:00" },
            Arrival: { location: "DXB", date: "2026-09-01", time: "10:30:00" },
            duration: 150,
          },
          {
            id: "flt-2",
            Carrier: "PK",
            number: "305",
            Departure: { location: "DXB", date: "2026-09-01", time: "13:00:00" },
            Arrival: { location: "LHR", date: "2026-09-01", time: "17:40:00" },
            duration: 400,
          },
        ],
      },
    },
  },
};

const SAMPLE_PRICE = {
  OfferListResponse: {
    Identifier: { value: "price-tx-1" },
    Offer: [
      {
        Price: {
          TotalPrice: 85000,
          CurrencyCode: "PKR",
          Base: 72000,
          TotalTaxes: 13000,
        },
      },
    ],
  },
};

const SAMPLE_PRICE_CHANGED = {
  OfferListResponse: {
    Identifier: { value: "price-tx-2" },
    Offer: [
      {
        Price: {
          TotalPrice: 90000,
          CurrencyCode: "PKR",
          Base: 76000,
          TotalTaxes: 14000,
        },
      },
    ],
  },
};

function setTravelportEnv(partial: Record<string, string>) {
  process.env.FLIGHT_SUPPLIER = "travelport";
  process.env.TRAVELPORT_ENVIRONMENT = "sandbox";
  process.env.TRAVELPORT_CLIENT_ID = partial.clientId ?? "test-client";
  process.env.TRAVELPORT_CLIENT_SECRET = partial.clientSecret ?? "test-secret";
  process.env.TRAVELPORT_USERNAME = partial.username ?? "test-user";
  process.env.TRAVELPORT_PASSWORD = partial.password ?? "test-pass";
  process.env.TRAVELPORT_ACCESS_GROUP = partial.accessGroup ?? "access-group";
  process.env.TRAVELPORT_PCC = partial.pcc ?? "PCC1";
  process.env.TRAVELPORT_REQUIRE_CREDENTIALS = "false";
}

function clearTravelportEnv() {
  delete process.env.TRAVELPORT_CLIENT_ID;
  delete process.env.TRAVELPORT_CLIENT_SECRET;
  delete process.env.TRAVELPORT_USERNAME;
  delete process.env.TRAVELPORT_PASSWORD;
  delete process.env.TRAVELPORT_ACCESS_GROUP;
  delete process.env.TRAVELPORT_PCC;
  delete process.env.TRAVELPORT_REQUIRE_CREDENTIALS;
  delete process.env.TRAVELPORT_ENABLE_SANDBOX_BOOKING;
  process.env.FLIGHT_SUPPLIER = "mock";
}

function mockFetchSequence(
  handlers: Array<(url: string, init?: RequestInit) => Promise<Response> | Response>,
) {
  let index = 0;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const handler = handlers[index++];
    if (!handler) {
      throw new Error(`Unexpected fetch call: ${url}`);
    }
    return handler(url, init);
  };
}

describe("Phase 7B Travelport adapter", () => {
  beforeEach(() => {
    clearTravelportOfferCache();
    clearTravelportTokenCache();
    setTravelportEnv({});
    setFlightSupplier(new MockFlightSupplier());
  });

  afterEach(() => {
    clearTravelportEnv();
    clearTravelportOfferCache();
    clearTravelportTokenCache();
  });

  it("loads Travelport adapter when configured", () => {
    const env = getFlightSupplierEnv();
    assert.equal(env.activeSupplier, "travelport");
    assert.equal(env.travelport.hasCredentials, true);
    const supplier = new TravelportFlightSupplier();
    assert.equal(supplier.code, "TRAVELPORT");
    assert.equal(supplier.isMock, false);
  });

  it("reports missing credentials safely", () => {
    clearTravelportEnv();
    process.env.FLIGHT_SUPPLIER = "travelport";
    const env = getFlightSupplierEnv();
    assert.equal(env.travelport.hasCredentials, false);
  });

  it("maps authentication failure", async () => {
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(JSON.stringify({ error: "invalid_grant" }), { status: 401 }),
    ]);
    const supplier = new TravelportFlightSupplier({ fetchImpl: fetchImpl as typeof fetch });
    await assert.rejects(
      () =>
        supplier.searchFlights({
          origin: "ISB",
          destination: "DXB",
          departureDate: "2026-09-01",
          tripType: "ONE_WAY",
          adults: 1,
          children: 0,
          infants: 0,
          cabinClass: "ECONOMY",
          currency: "PKR",
        }),
      (error: unknown) =>
        error instanceof SupplierError && error.code === "SUPPLIER_UNAVAILABLE",
    );
  });

  it("maps search request fields", () => {
    const body = buildTravelportSearchRequest({
      origin: "isb",
      destination: "dxb",
      departureDate: "2026-09-01",
      returnDate: "2026-09-10",
      tripType: "ROUND_TRIP",
      adults: 2,
      children: 1,
      infants: 1,
      cabinClass: "BUSINESS",
      currency: "PKR",
    });
    const request = body.CatalogProductOfferingsQueryRequest.CatalogProductOfferingsRequest;
    assert.equal(request.PassengerCriteria.length, 3);
    assert.equal(request.SearchCriteriaFlight.length, 2);
    assert.equal(request.SearchCriteriaFlight[0]!.From.value, "ISB");
    assert.equal(request.SearchCriteriaFlight[1]!.To.value, "ISB");
  });

  it("normalizes search response including multiple segments", () => {
    const { offers, catalogOfferingsId } = normalizeTravelportSearchResponse(SAMPLE_SEARCH, {
      tripType: "ONE_WAY",
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    assert.equal(catalogOfferingsId, "catalog-offerings-1");
    assert.equal(offers.length, 1);
    const offer = offers[0]!;
    assert.equal(offer.supplierCode, "TRAVELPORT");
    assert.equal(offer.segments.length, 2);
    assert.equal(offer.stops, 1);
    assert.equal(offer.totalPrice, 85000);
    assert.equal(offer.fareFamily, "Economy Flex");
    assert.ok(offer.supplierSessionRef);
  });

  it("handles missing optional fields safely", () => {
    const { offers } = normalizeTravelportSearchResponse(
      {
        CatalogProductOfferingsResponse: {
          CatalogProductOfferings: {
            CatalogProductOffering: [
              {
                id: "sparse",
                ProductBrandOptions: [
                  {
                    ProductBrandOffering: [
                      {
                        Product: [{ id: "p1", FlightRef: ["missing"] }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      { tripType: "ONE_WAY", cabinClass: "ECONOMY", currency: "PKR" },
    );
    assert.equal(offers.length, 0);
  });

  it("searches and caches offers via mocked Travelport HTTP", async () => {
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(
          JSON.stringify({ access_token: "token-1", expires_in: 3600 }),
          { status: 200 },
        ),
      async (url) => {
        assert.match(url, /catalog\/search\/catalogproductofferings/);
        return new Response(JSON.stringify(SAMPLE_SEARCH), { status: 200 });
      },
    ]);
    const supplier = new TravelportFlightSupplier({ fetchImpl: fetchImpl as typeof fetch });
    const result = await supplier.searchFlights({
      origin: "ISB",
      destination: "LHR",
      departureDate: "2026-09-01",
      tripType: "ONE_WAY",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    assert.equal(result.supplierCode, "TRAVELPORT");
    assert.equal(result.isMock, false);
    assert.ok(result.offers.length > 0);

    const cached = await supplier.getOffer({ internalOfferId: result.offers[0]!.id });
    assert.ok(cached);
    assert.equal(cached.supplierOfferId, "cpo-1");
  });

  it("revalidates with unchanged price", async () => {
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(
          JSON.stringify({ access_token: "token-1", expires_in: 3600 }),
          { status: 200 },
        ),
      async () => new Response(JSON.stringify(SAMPLE_SEARCH), { status: 200 }),
      async () => new Response(JSON.stringify(SAMPLE_PRICE), { status: 200 }),
    ]);
    const supplier = new TravelportFlightSupplier({ fetchImpl: fetchImpl as typeof fetch });
    const search = await supplier.searchFlights({
      origin: "ISB",
      destination: "LHR",
      departureDate: "2026-09-01",
      tripType: "ONE_WAY",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    const offer = search.offers[0]!;
    const result = await supplier.revalidateOffer({
      internalOfferId: offer.id,
      supplierOfferId: offer.supplierOfferId,
      supplierCode: "TRAVELPORT",
      supplierSessionRef: offer.supplierSessionRef,
      expectedTotal: offer.totalPrice,
      currency: "PKR",
    });
    assert.equal(result.status, "VALID");
    assert.equal(result.ok, true);
    assert.equal(result.currentTotal, 85000);
  });

  it("detects price changes", async () => {
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(
          JSON.stringify({ access_token: "token-1", expires_in: 3600 }),
          { status: 200 },
        ),
      async () => new Response(JSON.stringify(SAMPLE_SEARCH), { status: 200 }),
      async () => new Response(JSON.stringify(SAMPLE_PRICE_CHANGED), { status: 200 }),
    ]);
    const supplier = new TravelportFlightSupplier({ fetchImpl: fetchImpl as typeof fetch });
    const search = await supplier.searchFlights({
      origin: "ISB",
      destination: "LHR",
      departureDate: "2026-09-01",
      tripType: "ONE_WAY",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    const offer = search.offers[0]!;
    const result = await supplier.revalidateOffer({
      internalOfferId: offer.id,
      supplierOfferId: offer.supplierOfferId,
      supplierCode: "TRAVELPORT",
      supplierSessionRef: offer.supplierSessionRef,
      expectedTotal: offer.totalPrice,
      currency: "PKR",
    });
    assert.equal(result.status, "PRICE_CHANGED");
    assert.equal(result.previousTotal, 85000);
    assert.equal(result.currentTotal, 90000);
  });

  it("maps offer expired errors", async () => {
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(
          JSON.stringify({ access_token: "token-1", expires_in: 3600 }),
          { status: 200 },
        ),
      async () => new Response(JSON.stringify(SAMPLE_SEARCH), { status: 200 }),
      async () =>
        new Response(JSON.stringify({ message: "Offer expired" }), { status: 400 }),
    ]);
    const supplier = new TravelportFlightSupplier({ fetchImpl: fetchImpl as typeof fetch });
    const search = await supplier.searchFlights({
      origin: "ISB",
      destination: "LHR",
      departureDate: "2026-09-01",
      tripType: "ONE_WAY",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      currency: "PKR",
    });
    const offer = search.offers[0]!;
    const result = await supplier.revalidateOffer({
      internalOfferId: offer.id,
      supplierOfferId: offer.supplierOfferId,
      supplierCode: "TRAVELPORT",
      supplierSessionRef: offer.supplierSessionRef,
      expectedTotal: offer.totalPrice,
    });
    assert.equal(result.status, "EXPIRED");
  });

  it("maps no availability", async () => {
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(
          JSON.stringify({ access_token: "token-1", expires_in: 3600 }),
          { status: 200 },
        ),
      async () =>
        new Response(JSON.stringify({ message: "No availability / sold out" }), {
          status: 400,
        }),
    ]);
    const supplier = new TravelportFlightSupplier({ fetchImpl: fetchImpl as typeof fetch });
    await assert.rejects(
      () =>
        supplier.searchFlights({
          origin: "ISB",
          destination: "DXB",
          departureDate: "2026-09-01",
          tripType: "ONE_WAY",
          adults: 1,
          children: 0,
          infants: 0,
          cabinClass: "ECONOMY",
          currency: "PKR",
        }),
      (error: unknown) =>
        error instanceof SupplierError && error.code === "NO_AVAILABILITY",
    );
  });

  it("maps supplier timeout", async () => {
    const fetchImpl = async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    };
    const supplier = new TravelportFlightSupplier({ fetchImpl: fetchImpl as typeof fetch });
    // Force token cache miss path with env present — auth will abort.
    await assert.rejects(
      () =>
        supplier.searchFlights({
          origin: "ISB",
          destination: "DXB",
          departureDate: "2026-09-01",
          tripType: "ONE_WAY",
          adults: 1,
          children: 0,
          infants: 0,
          cabinClass: "ECONOMY",
          currency: "PKR",
        }),
      (error: unknown) =>
        error instanceof SupplierError && error.code === "SUPPLIER_TIMEOUT",
    );
  });

  it("reports health when auth succeeds", async () => {
    const fetchImpl = mockFetchSequence([
      async () =>
        new Response(
          JSON.stringify({ access_token: "token-health", expires_in: 3600 }),
          { status: 200 },
        ),
    ]);
    const supplier = new TravelportFlightSupplier({ fetchImpl: fetchImpl as typeof fetch });
    const health = await supplier.getHealthStatus();
    assert.equal(health.configured, true);
    assert.equal(health.available, true);
    assert.equal(health.isMock, false);
  });

  it("returns NOT_CONFIGURED for booking and ticketing", async () => {
    const supplier = new TravelportFlightSupplier();
    const booking = await supplier.createBooking({
      idempotencyKey: buildIdempotencyKey(["tp", "book", "1"]),
      internalOfferId: "tp-1",
      supplierOfferId: "cpo-1",
      supplierCode: "TRAVELPORT",
      contactEmail: "guest@example.com",
      passengers: [
        {
          type: "ADULT",
          firstName: "A",
          lastName: "B",
          hasTravelDocument: true,
        },
      ],
    });
    assert.equal(booking.ok, false);
    if (!booking.ok) assert.equal(booking.code, "NOT_CONFIGURED");

    const ticket = await supplier.issueTicket({
      idempotencyKey: buildIdempotencyKey(["tp", "ticket", "1"]),
      bookingReference: "GB-TEST",
      bookingId: "id-1",
    });
    assert.equal(ticket.ok, false);
    if (!ticket.ok) assert.equal(ticket.code, "NOT_CONFIGURED");
  });

  it("protects booking with idempotency", async () => {
    const supplier = new TravelportFlightSupplier();
    const key = buildIdempotencyKey(["tp-idem", String(Date.now())]);
    const first = await supplier.createBooking({
      idempotencyKey: key,
      internalOfferId: "tp-1",
      supplierOfferId: "cpo-1",
      supplierCode: "TRAVELPORT",
      contactEmail: "guest@example.com",
      passengers: [{ type: "ADULT", firstName: "A", lastName: "B", hasTravelDocument: false }],
    });
    const second = await supplier.createBooking({
      idempotencyKey: key,
      internalOfferId: "tp-1",
      supplierOfferId: "cpo-1",
      supplierCode: "TRAVELPORT",
      contactEmail: "guest@example.com",
      passengers: [{ type: "ADULT", firstName: "A", lastName: "B", hasTravelDocument: false }],
    });
    assert.deepEqual(first, second);

    const { replayed } = await withIdempotency(key, "createBooking", async () => first);
    assert.equal(replayed, true);
  });

  it("normalizes sanitized international/domestic/multi-segment fixtures", () => {
    const { offers } = normalizeTravelportSearchResponse(
      sanitizedTravelportSearchFixture,
      { tripType: "ONE_WAY", cabinClass: "ECONOMY", currency: "PKR" },
    );
    assert.ok(offers.length >= 3);
    const intl = offers.find((o) => o.supplierOfferId === "fixture-cpo-intl");
    const domestic = offers.find((o) => o.supplierOfferId === "fixture-cpo-domestic");
    const multi = offers.find((o) => o.supplierOfferId === "fixture-cpo-multi");
    assert.ok(intl);
    assert.equal(intl!.segments[0]?.origin.iataCode, "ISB");
    assert.equal(intl!.segments[0]?.destination.iataCode, "DXB");
    assert.equal(intl!.baggageIncluded, true);
    assert.equal(intl!.baggageKg, 23);
    assert.ok(domestic);
    assert.equal(domestic!.baggageIncluded, false);
    assert.ok(multi);
    assert.equal(multi!.segments.length, 2);
    assert.equal(multi!.stops, 1);
    assert.equal(multi!.currency, "USD");
  });

  it("normalizes AirPrice valid and changed fixtures", () => {
    const { offers } = normalizeTravelportSearchResponse(
      sanitizedTravelportSearchFixture,
      { tripType: "ONE_WAY", cabinClass: "ECONOMY", currency: "PKR" },
    );
    const base = offers.find((o) => o.supplierOfferId === "fixture-cpo-intl")!;
    const valid = normalizeTravelportPriceResponse(
      sanitizedTravelportPriceValidFixture,
      base,
    );
    assert.equal(valid.total, 125000);
    const changed = normalizeTravelportPriceResponse(
      sanitizedTravelportPriceChangedFixture,
      base,
    );
    assert.equal(changed.total, 132500);
    assert.notEqual(changed.total, base.totalPrice);
  });

  it("keeps mock supplier working", async () => {
    process.env.FLIGHT_SUPPLIER = "mock";
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
    assert.equal(result.isMock, true);
    assert.ok(result.offers.length > 0);
  });
});

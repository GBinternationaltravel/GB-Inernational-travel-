import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateMockOffers } from "@/data/mock/flights";
import {
  calculateAgencyMarkup,
  calculateCombinedOfferPriceSnapshot,
  calculateOfferPriceSnapshot,
} from "@/lib/booking/pricing";
import {
  cheapestOffer,
  generateLegOffers,
  reverseRoute,
  summarizeRoundTripFares,
} from "@/lib/flights/round-trip";

const oneWaySearch = {
  tripType: "ONE_WAY" as const,
  origin: "ISB",
  destination: "KDU",
  departureDate: "2026-10-11",
  adults: 1,
  children: 0,
  infants: 0,
  cabinClass: "ECONOMY" as const,
  currency: "PKR" as const,
};

const roundTripSearch = {
  ...oneWaySearch,
  tripType: "ROUND_TRIP" as const,
  returnDate: "2026-10-18",
};

describe("round-trip fare generation", () => {
  it("keeps ONE_WAY working as a single outbound search", () => {
    const offers = generateMockOffers(oneWaySearch);
    assert.ok(offers.length > 0);
    for (const offer of offers) {
      const first = offer.segments[0];
      const last = offer.segments[offer.segments.length - 1];
      assert.equal(first?.origin.iataCode, "ISB");
      assert.equal(last?.destination.iataCode, "KDU");
    }
    const summary = summarizeRoundTripFares(oneWaySearch);
    assert.equal(summary.tripType, "ONE_WAY");
    assert.ok(summary.outbound);
    assert.equal(summary.inbound, null);
    assert.equal(summary.combinedSupplierFare, summary.outbound?.supplierFare);
  });

  it("generates an outbound fare for ROUND_TRIP", () => {
    const summary = summarizeRoundTripFares(roundTripSearch);
    assert.ok(summary.outbound);
    assert.equal(summary.outbound.origin, "ISB");
    assert.equal(summary.outbound.destination, "KDU");
    assert.equal(summary.outbound.date, "2026-10-11");
    assert.ok(summary.outbound.supplierFare > 0);
  });

  it("generates a return fare for ROUND_TRIP", () => {
    const summary = summarizeRoundTripFares(roundTripSearch);
    assert.ok(summary.inbound);
    assert.equal(summary.inbound.date, "2026-10-18");
    assert.ok(summary.inbound.supplierFare > 0);
  });

  it("reverses the return route correctly", () => {
    const reversed = reverseRoute("ISB", "KDU");
    assert.deepEqual(reversed, { origin: "KDU", destination: "ISB" });
    const summary = summarizeRoundTripFares(roundTripSearch);
    assert.equal(summary.inbound?.origin, "KDU");
    assert.equal(summary.inbound?.destination, "ISB");
    const inboundOffers = generateLegOffers({
      origin: "KDU",
      destination: "ISB",
      departureDate: "2026-10-18",
      cabinClass: "ECONOMY",
    });
    assert.ok(inboundOffers.length > 0);
    const inboundOffer = inboundOffers[0];
    const first = inboundOffer?.segments[0];
    const last = inboundOffer?.segments[inboundOffer.segments.length - 1];
    assert.equal(first?.origin.iataCode, "KDU");
    assert.equal(last?.destination.iataCode, "ISB");
  });

  it("uses different outbound and return prices when inventory differs", () => {
    const summary = summarizeRoundTripFares(roundTripSearch);
    assert.ok(summary.outbound && summary.inbound);
    assert.notEqual(summary.outbound.supplierFare, summary.inbound.supplierFare);
    assert.notEqual(summary.outbound.offerId, summary.inbound.offerId);
  });

  it("combines outbound and return supplier fares", () => {
    const summary = summarizeRoundTripFares(roundTripSearch);
    assert.ok(summary.outbound && summary.inbound);
    assert.equal(
      summary.combinedSupplierFare,
      summary.outbound.supplierFare + summary.inbound.supplierFare,
    );
  });

  it("does not change the outbound fare when only the return date changes", () => {
    const first = summarizeRoundTripFares(roundTripSearch);
    const shiftedReturn = summarizeRoundTripFares({
      ...roundTripSearch,
      returnDate: "2026-10-25",
    });
    assert.equal(first.outbound?.supplierFare, shiftedReturn.outbound?.supplierFare);
    assert.equal(first.outbound?.offerId, shiftedReturn.outbound?.offerId);
    assert.equal(first.outbound?.date, "2026-10-11");
    assert.equal(shiftedReturn.inbound?.date, "2026-10-25");
  });

  it("does not overwrite the return fare when only the departure date changes", () => {
    const first = summarizeRoundTripFares(roundTripSearch);
    const shiftedDeparture = summarizeRoundTripFares({
      ...roundTripSearch,
      departureDate: "2026-10-12",
    });
    assert.equal(first.inbound?.supplierFare, shiftedDeparture.inbound?.supplierFare);
    assert.equal(first.inbound?.offerId, shiftedDeparture.inbound?.offerId);
    assert.equal(first.inbound?.date, "2026-10-18");
    assert.equal(shiftedDeparture.outbound?.date, "2026-10-12");
  });

  it("applies markup once to the combined supplier fare", () => {
    const outbound = cheapestOffer(
      generateLegOffers({
        origin: "KHI",
        destination: "ISB",
        departureDate: "2026-10-11",
        cabinClass: "ECONOMY",
      }),
    );
    const inbound = cheapestOffer(
      generateLegOffers({
        origin: "ISB",
        destination: "KHI",
        departureDate: "2026-10-18",
        cabinClass: "ECONOMY",
      }),
    );
    assert.ok(outbound && inbound);
    assert.ok(outbound.totalPrice <= 50_000);
    assert.ok(inbound.totalPrice <= 50_000);

    const combined = calculateCombinedOfferPriceSnapshot([outbound, inbound]);
    const expected = calculateAgencyMarkup(
      Math.round(outbound.totalPrice) + Math.round(inbound.totalPrice),
    );
    assert.equal(combined.supplierFare, expected.supplierFare);
    assert.equal(combined.fees, expected.markup);
    assert.equal(combined.total, expected.customerTotal);
    assert.equal(combined.markupRate, expected.rate);

    const outboundOnly = calculateOfferPriceSnapshot(outbound);
    const inboundOnly = calculateOfferPriceSnapshot(inbound);
    assert.notEqual(
      combined.fees,
      outboundOnly.fees + inboundOnly.fees,
      "markup must not be applied separately to each leg",
    );

    const highOutbound = cheapestOffer(
      generateLegOffers({
        origin: "ISB",
        destination: "DXB",
        departureDate: "2026-10-11",
        cabinClass: "ECONOMY",
      }),
    );
    const highInbound = cheapestOffer(
      generateLegOffers({
        origin: "DXB",
        destination: "ISB",
        departureDate: "2026-10-18",
        cabinClass: "ECONOMY",
      }),
    );
    assert.ok(highOutbound && highInbound);
    const highCombined = calculateCombinedOfferPriceSnapshot([highOutbound, highInbound]);
    assert.ok(highCombined.supplierFare > 50_000);
    assert.equal(highCombined.fees, calculateAgencyMarkup(highCombined.supplierFare).markup);
    assert.ok(typeof highCombined.feePerSeat === "number");
  });
});

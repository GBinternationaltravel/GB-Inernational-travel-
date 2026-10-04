import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOfferSnapshot,
  calculateAgencyMarkup,
  calculateOfferPriceSnapshot,
  describeServiceFee,
  markupOptionsForOffer,
  serviceFeePerSeat,
} from "@/lib/booking/pricing";
import {
  CUSTOMER_FARE_LABEL,
  customerOfferTotal,
  customerPricingNotice,
} from "@/lib/booking/customer-price";
import { defaultFlightFilters, filterOffers, sortOffers } from "@/lib/flights/filter-sort";
import type { FlightOffer } from "@/types/flight";

function offer(overrides: Partial<FlightOffer> = {}): FlightOffer {
  const totalPrice = overrides.totalPrice ?? 25_000;
  return {
    id: "inv_test",
    providerCode: "INVENTORY",
    supplierCode: "INVENTORY",
    supplierOfferId: "inv-test",
    isMock: false,
    airlineId: "pk",
    tripType: "ONE_WAY",
    cabinClass: "ECONOMY",
    currency: "PKR",
    totalPrice,
    baseFare: Math.round(totalPrice * 0.88),
    taxes: Math.round(totalPrice * 0.12),
    segments: [
      {
        origin: { iataCode: "ISB", name: "Islamabad", city: "Islamabad", country: "Pakistan" },
        destination: { iataCode: "GIL", name: "Gilgit", city: "Gilgit", country: "Pakistan" },
        departureAt: "2026-11-01T05:00:00.000Z",
        arrivalAt: "2026-11-01T06:00:00.000Z",
        durationMinutes: 60,
        flightNumber: "PK605",
        airline: { iataCode: "PK", name: "PIA" },
      },
    ],
    stops: 0,
    durationMinutes: 60,
    baggageKg: 20,
    baggageIncluded: true,
    refundable: false,
    ...overrides,
  };
}

describe("GB service fee — fixed amount per seat", () => {
  it("picks the tier from the per-seat fare (boundaries inclusive)", () => {
    const cases: Array<[number, number]> = [
      [0, 1_000],
      [1, 1_000],
      [25_000, 1_000],
      [30_000, 1_000],
      [30_001, 1_500],
      [45_000, 1_500],
      [100_000, 1_500],
      [100_001, 2_500],
      [150_000, 2_500],
      [1_000_000, 2_500],
    ];
    for (const [fare, fee] of cases) {
      assert.equal(serviceFeePerSeat(fare).feePerSeat, fee, `fare ${fare}`);
    }
  });

  it("matches the owner's worked examples for 1 adult", () => {
    assert.equal(calculateAgencyMarkup(25_000).customerTotal, 26_000);
    assert.equal(calculateAgencyMarkup(45_000).customerTotal, 46_500);
    assert.equal(calculateAgencyMarkup(150_000).customerTotal, 152_500);
  });

  it("never charges more than PKR 2,500 per seat", () => {
    const m = calculateAgencyMarkup(5_000_000);
    assert.equal(m.feePerSeat, 2_500);
    assert.equal(m.markup, 2_500);
  });

  it("charges every adult/child seat, using the per-seat fare for the tier", () => {
    // 3 seats × 28,000 = 84,000 total → per-seat 28,000 → PKR 1,000 × 3
    const m = calculateAgencyMarkup(84_000, { seats: 3 });
    assert.equal(m.perSeatFare, 28_000);
    assert.equal(m.feePerSeat, 1_000);
    assert.equal(m.markup, 3_000);
    assert.equal(m.customerTotal, 87_000);
  });

  it("charges no fee on infants and excludes infant fare from the per-seat fare", () => {
    // 1 adult at 29,000 + 1 infant at 2,900 = 31,900. Per-seat fare is 29,000 → 1,000.
    const m = calculateAgencyMarkup(31_900, { seats: 1, infantFare: 2_900 });
    assert.equal(m.perSeatFare, 29_000);
    assert.equal(m.markup, 1_000);
    assert.equal(m.customerTotal, 32_900);
  });

  it("charges nothing when there is no supplier fare", () => {
    const m = calculateAgencyMarkup(0);
    assert.equal(m.markup, 0);
    assert.equal(m.customerTotal, 0);
  });

  it("is applied once: rebuilding from the supplier fare gives the same fee", () => {
    const a = calculateAgencyMarkup(45_000);
    const b = calculateAgencyMarkup(a.supplierFare);
    assert.equal(b.markup, a.markup);
  });
});

describe("Offer price snapshot", () => {
  it("keeps the same output fields and total = supplierFare + fees", () => {
    const snap = calculateOfferPriceSnapshot(offer({ totalPrice: 45_000 }));
    assert.equal(snap.supplierFare, 45_000);
    assert.equal(snap.fees, 1_500);
    assert.equal(snap.total, 46_500);
    assert.equal(snap.feePerSeat, 1_500);
    assert.equal(snap.feeSeats, 1);
    assert.equal(typeof snap.markupRate, "number");
    assert.match(snap.notice, /PKR 1,500 per seat/);
    assert.doesNotMatch(snap.notice, /%/);
  });

  it("uses the priced passenger mix (2 adults + 1 child + 1 infant)", () => {
    // Inventory-style offer: per seat 32,000 (fare + taxes), infant 3,200.
    const seatFare = 32_000;
    const infantFareTotal = 3_200;
    const totalPrice = seatFare * 3 + infantFareTotal;
    const o = offer({
      totalPrice,
      pricedPassengers: { adults: 2, children: 1, infants: 1 },
      infantFareTotal,
    });
    assert.deepEqual(markupOptionsForOffer(o), { seats: 3, infantFare: 3_200 });
    const snap = buildOfferSnapshot(o).pricing;
    assert.equal(snap.feePerSeat, 1_500);
    assert.equal(snap.feeSeats, 3);
    assert.equal(snap.fees, 4_500);
    assert.equal(snap.total, totalPrice + 4_500);
    assert.match(snap.notice, /no fee for infants/);
  });

  it("treats an offer without a passenger mix as one seat", () => {
    assert.deepEqual(markupOptionsForOffer(offer()), { seats: 1, infantFare: 0 });
  });

  it("describes new and legacy fee bases", () => {
    assert.equal(
      describeServiceFee({ markupRate: 0.03, feePerSeat: 1_500, feeSeats: 2 }),
      "PKR 1,500 per seat × 2",
    );
    assert.equal(describeServiceFee({ markupRate: 0.04, feePerSeat: 1_000 }), "PKR 1,000 per seat");
    assert.equal(describeServiceFee({ markupRate: 0.05 }), "5%");
    assert.equal(describeServiceFee({ markupRate: 0.035 }), "3.5%");
    assert.equal(describeServiceFee(null), null);
  });
});

describe("Customer price display (GB service fee folded in)", () => {
  it("shows customers the total with the fee already included", () => {
    assert.equal(customerOfferTotal(offer({ totalPrice: 90_542 })), 92_042);
    assert.equal(customerOfferTotal(offer({ totalPrice: 25_000 })), 26_000);
    // Same number the charged booking total comes from.
    const o = offer({ totalPrice: 150_000 });
    assert.equal(customerOfferTotal(o), buildOfferSnapshot(o).pricing.total);
  });

  it("uses customer wording with no service-fee line or amount", () => {
    assert.equal(CUSTOMER_FARE_LABEL, "Fare (incl. taxes & fees)");
    for (const notice of [customerPricingNotice(true), customerPricingNotice(false)]) {
      assert.doesNotMatch(notice, /service fee|per seat|GB fee|PKR|\d/i);
      assert.match(notice, /includes all taxes and fees/);
    }
  });

  it("sorts cheapest-first by the customer total, not the supplier fare", () => {
    const pax = { adults: 1, children: 0, infants: 1 };
    // Supplier 31,000 incl. 3,000 infant fare → seat 28,000 → fee 1,000 → customer 32,000.
    const a = offer({ id: "a", totalPrice: 31_000, pricedPassengers: pax, infantFareTotal: 3_000 });
    // Supplier 30,800, infant fare 0 → seat 30,800 → fee 1,500 → customer 32,300.
    const b = offer({ id: "b", totalPrice: 30_800, pricedPassengers: pax, infantFareTotal: 0 });
    assert.deepEqual(
      sortOffers([b, a], "cheapest").map((o) => o.id),
      ["a", "b"],
    );
  });

  it("filters prices against the customer total", () => {
    const o = offer({ id: "x", totalPrice: 90_542 }); // customer 92,042
    const base = defaultFlightFilters();
    assert.equal(filterOffers([o], { ...base, maxPrice: 91_000 }).length, 0);
    assert.equal(filterOffers([o], { ...base, maxPrice: 92_042 }).length, 1);
    assert.equal(filterOffers([o], { ...base, minPrice: 92_000 }).length, 1);
    assert.equal(filterOffers([o], { ...base, minPrice: 92_043 }).length, 0);
  });
});

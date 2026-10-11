/**
 * Markup + admin-nav polish checks.
 * Usage: npx tsx --env-file=.env scripts/qa-staging-polish.ts
 */
import assert from "node:assert/strict";
import { calculateAgencyMarkup, calculateOfferPriceSnapshot } from "../src/lib/booking/pricing";
import { filterAdminNavForRole } from "../src/lib/auth/admin-nav";
import type { FlightOffer } from "../src/types/flight";

function pass(name: string, detail: string) {
  console.log(`PASS  [${name}] ${detail}`);
}

function offerAt(total: number): FlightOffer {
  return {
    id: `offer-${total}`,
    isMock: true,
    providerCode: "MOCK",
    supplierCode: "MOCK",
    supplierOfferId: `sup-${total}`,
    airlineId: "pk",
    currency: "PKR",
    totalPrice: total,
    baseFare: Math.round(total * 0.88),
    taxes: Math.round(total * 0.12),
    cabinClass: "ECONOMY",
    durationMinutes: 200,
    stops: 0,
    baggageKg: 23,
    baggageIncluded: true,
    refundable: false,
    segments: [
      {
        airline: { id: "pk", iataCode: "PK", name: "PIA" },
        flightNumber: "PK309",
        origin: {
          iataCode: "KHI",
          name: "Karachi",
          city: "Karachi",
          country: "Pakistan",
        },
        destination: {
          iataCode: "DXB",
          name: "Dubai",
          city: "Dubai",
          country: "UAE",
        },
        departureAt: "2026-09-01T08:00:00.000Z",
        arrivalAt: "2026-09-01T10:00:00.000Z",
      },
    ],
  } as FlightOffer;
}

const cases: Array<{ fare: number; fee: number }> = [
  { fare: 25_000, fee: 1_000 },
  { fare: 30_000, fee: 1_000 },
  { fare: 30_001, fee: 1_500 },
  { fare: 45_000, fee: 1_500 },
  { fare: 100_000, fee: 1_500 },
  { fare: 100_001, fee: 2_500 },
  { fare: 150_000, fee: 2_500 },
];

let failed = 0;

for (const c of cases) {
  const m = calculateAgencyMarkup(c.fare);
  try {
    assert.equal(m.feePerSeat, c.fee);
    assert.equal(m.markup, c.fee);
    assert.equal(m.customerTotal, c.fare + m.markup);
    // Apply twice must not compound if we always pass supplier fare
    const again = calculateAgencyMarkup(m.supplierFare);
    assert.equal(again.markup, m.markup);
    pass("MARKUP", `${c.fare} → fee/seat=${m.feePerSeat} markup=${m.markup} total=${m.customerTotal}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL  [MARKUP] ${c.fare}: ${e instanceof Error ? e.message : e}`);
  }
}

// Snapshot applies once from offer total (supplier fare)
const snap = calculateOfferPriceSnapshot(offerAt(50_000));
assert.equal(snap.supplierFare, 50_000);
assert.equal(snap.fees, 1_500);
assert.equal(snap.total, 51_500);
const snap2 = calculateOfferPriceSnapshot(offerAt(50_000));
assert.equal(snap2.total, snap.total);
pass("MARKUP_ONCE", "refresh/rebuild snapshot does not double markup");

const high = calculateOfferPriceSnapshot(offerAt(150_000));
assert.equal(high.feePerSeat, 2_500);
assert.equal(high.fees, 2_500);
assert.equal(high.total, 152_500);
pass("MARKUP_HIGH", "150000 → PKR 2,500 per seat");

// Changing flights: new supplier fare → fresh markup (never reuse previous fees)
const flightA = calculateOfferPriceSnapshot(offerAt(29_500));
const flightB = calculateOfferPriceSnapshot(offerAt(120_000));
assert.equal(flightA.fees, 1_000);
assert.equal(flightA.total, 30_500);
assert.equal(flightB.fees, 2_500);
assert.equal(flightB.total, 122_500);
assert.notEqual(flightA.fees, flightB.fees);
pass("MARKUP_FLIGHT_CHANGE", "29.5k@1,000 → 120k@2,500 recalculated from supplier fare");

// Anti-compound: if customer total were wrongly fed back as supplier fare, totals would inflate
const compounded = calculateAgencyMarkup(flightA.total);
assert.ok(compounded.customerTotal > flightA.total);
assert.notEqual(compounded.markup, flightA.fees);
pass(
  "MARKUP_NO_COMPOUND_GUARD",
  "feeding customer total as fare would inflate — callers must pass supplierFare only",
);

// Payment / admin view identity: customer total = supplier + markup (once)
assert.equal(flightA.total, flightA.supplierFare + flightA.fees);
assert.equal(flightB.total, flightB.supplierFare + flightB.fees);
pass("MARKUP_PAYMENT_TOTAL", "customer total = supplierFare + fees (single application)");

// Role nav filtering
const issuerNav = filterAdminNavForRole("TICKET_ISSUER").map((i) => i.href);
assert.ok(issuerNav.includes("/admin/bookings"));
assert.ok(!issuerNav.includes("/admin/payments"));
assert.ok(!issuerNav.includes("/admin/settings"));
assert.ok(!issuerNav.includes("/admin/airlines"));
pass("NAV_TICKET_ISSUER", issuerNav.join(", "));

const accountantNav = filterAdminNavForRole("ACCOUNTANT").map((i) => i.href);
assert.ok(accountantNav.includes("/admin/payments"));
assert.ok(accountantNav.includes("/admin/reports"));
assert.ok(!accountantNav.includes("/admin/airlines"));
assert.ok(!accountantNav.includes("/admin/settings"));
pass("NAV_ACCOUNTANT", accountantNav.join(", "));

const managerNav = filterAdminNavForRole("MANAGER").map((i) => i.href);
assert.ok(managerNav.includes("/admin/airlines"));
assert.ok(managerNav.includes("/admin/bookings"));
assert.ok(!managerNav.includes("/admin/settings"));
pass("NAV_MANAGER", `cms+bookings visible, settings hidden (${managerNav.length} items)`);

const adminNavHrefs = filterAdminNavForRole("ADMIN").map((i) => i.href);
assert.ok(adminNavHrefs.includes("/admin/settings"));
assert.ok(adminNavHrefs.includes("/admin/audit-logs"));
pass("NAV_ADMIN", `${adminNavHrefs.length} items including settings`);

if (failed) {
  process.exitCode = 1;
} else {
  console.log("\n=== STAGING POLISH CHECKS OK ===");
}

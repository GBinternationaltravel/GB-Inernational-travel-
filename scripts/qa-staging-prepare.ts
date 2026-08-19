/**
 * Staging preparation probe — no secrets printed.
 * Usage: npx tsx --env-file=.env scripts/qa-staging-prepare.ts
 */
import assert from "node:assert/strict";
import { calculateAgencyMarkup } from "../src/lib/booking/pricing";
import { getAppEnv, requiresPrismaStores } from "../src/lib/data-store";
import { getProductionHealthReport } from "../src/lib/production-health";
import { getFlightSupplierEnv } from "../src/config/flight-supplier";
import { getPaymentEnv } from "../src/config/payment";

function pass(name: string, detail: string) {
  console.log(`PASS  [${name}] ${detail}`);
}

function fail(name: string, detail: string) {
  console.error(`FAIL  [${name}] ${detail}`);
}

let failures = 0;

async function main() {
  const health = await getProductionHealthReport();
  const flights = getFlightSupplierEnv();
  const payment = getPaymentEnv();
  const appEnv = getAppEnv();

  console.log("\n=== STAGING PREPARATION ===");
  console.log(`appEnv=${appEnv} nodeEnv=${process.env.NODE_ENV ?? "undefined"}`);
  console.log(`health.ok=${health.ok} stagingReady=${health.stagingReady}`);

  // Postgres + stores
  try {
    assert.equal(health.postgres.reachable, true);
    pass("POSTGRES", `reachable latencyMs=${health.postgres.latencyMs}`);
  } catch (e) {
    failures += 1;
    fail("POSTGRES", e instanceof Error ? e.message : String(e));
  }

  for (const [name, store] of [
    ["BOOKING_STORE", health.stores.booking],
    ["AUTH_STORE", health.stores.auth],
    ["NOTIFICATION_STORE", health.stores.notifications],
    ["PAYMENT_STORE", health.stores.payments],
  ] as const) {
    try {
      assert.equal(store.kind, "prisma");
      pass(name, "prisma");
    } catch (e) {
      failures += 1;
      fail(name, `expected prisma, got ${store.kind}`);
    }
  }

  // Safety gates must remain closed
  try {
    assert.equal(health.safetyGates.travelportProductionBlocked, true);
    assert.equal(health.safetyGates.safepayLiveBlocked, true);
    assert.equal(health.safetyGates.automaticLiveTicketingBlocked, true);
    assert.equal(health.live.travelportProduction, false);
    assert.equal(health.live.productionTicketing, false);
    assert.equal(payment.activeProvider === "MOCK" || payment.safepay.environment === "sandbox", true);
    assert.equal(flights.travelport.environment, "sandbox");
    pass("SAFETY_GATES", "Travelport LIVE / Safepay LIVE / auto live ticketing blocked");
  } catch (e) {
    failures += 1;
    fail("SAFETY_GATES", e instanceof Error ? e.message : String(e));
  }

  // Markup once
  const cases = [
    { fare: 25_000, rate: 0.05 },
    { fare: 40_000, rate: 0.05 },
    { fare: 50_000, rate: 0.05 },
    { fare: 50_001, rate: 0.035 },
    { fare: 60_000, rate: 0.035 },
    { fare: 100_000, rate: 0.035 },
  ];
  for (const c of cases) {
    const m = calculateAgencyMarkup(c.fare);
    try {
      assert.equal(m.rate, c.rate);
      assert.equal(m.customerTotal, c.fare + m.markup);
      assert.equal(calculateAgencyMarkup(m.supplierFare).markup, m.markup);
      pass("MARKUP", `${c.fare} → ${m.rate} total=${m.customerTotal}`);
    } catch (e) {
      failures += 1;
      fail("MARKUP", `${c.fare}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Provider modes (informational — mock is OK for staging)
  pass(
    "PROVIDERS",
    `flights=${flights.activeSupplier}/${flights.travelport.environment} payment=${payment.activeProvider} email=${health.providers.email.mode} weather=${health.providers.weather.mode} flightStatus=${health.providers.flightStatus.mode}`,
  );

  try {
    assert.equal(health.providers.reminders.cronSecretConfigured, true);
    pass("REMINDER_CRON", "REMINDER_CRON_SECRET configured (value not printed)");
  } catch {
    failures += 1;
    fail("REMINDER_CRON", "REMINDER_CRON_SECRET missing");
  }

  if (health.blockers.length) {
    console.log("\nHEALTH BLOCKERS:");
    for (const b of health.blockers) console.log(`  - ${b}`);
  }
  if (health.warnings?.length) {
    console.log("\nHEALTH WARNINGS:");
    for (const w of health.warnings) console.log(`  - ${w}`);
  }

  console.log("\nRecommended staging profile:");
  console.log("  APP_ENV=staging NODE_ENV=production");
  console.log("  stores=prisma FLIGHT_SUPPLIER=mock PAYMENT_PROVIDER=MOCK ALLOW_MOCK_PAYMENTS=true");
  console.log("  EMAIL_PROVIDER=console (or resend with key) WEATHER_PROVIDER=mock FLIGHT_STATUS_PROVIDER=mock");
  console.log("  Ticket issuer = MANUAL in Admin Settings");
  console.log(`  requiresPrismaStores=${requiresPrismaStores()}`);

  if (failures) {
    console.error(`\n=== STAGING PREPARE FAILED (${failures}) ===`);
    process.exitCode = 1;
  } else {
    console.log("\n=== STAGING PREPARE OK ===");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

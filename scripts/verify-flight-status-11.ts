/**
 * Phase 11 AviationStack verification (credentials presence + optional live call).
 * Never fabricates status. Never prints API keys.
 *
 * Usage: npx tsx scripts/verify-flight-status-11.ts
 */
import { getFlightStatusEnv } from "../src/config/flight-status";
import { AviationStackFlightStatusProvider } from "../src/providers/flight-status/aviationstack-flight-status-provider";
import { CommercialFlightStatusProvider } from "../src/providers/flight-status/commercial-flight-status-provider";
import { MockFlightStatusProvider } from "../src/providers/flight-status/mock-flight-status-provider";

async function main() {
  const env = getFlightStatusEnv();
  console.info("[verify:flight-status]", {
    configuredMode: env.configuredMode,
    activeMode: env.mode,
    hasCredentials: env.hasCredentials,
    useLive: env.useLive,
    notConfigured: env.notConfigured,
  });

  if (!env.useLive) {
    if (env.notConfigured || env.configuredMode === "aviationstack") {
      const commercial = new CommercialFlightStatusProvider();
      const result = await commercial.lookup({
        flightNumber: "PK309",
        date: "2026-09-01",
      });
      console.info(
        "[verify:flight-status] LIVE_VERIFICATION=SKIPPED NOT_CONFIGURED (missing FLIGHT_STATUS_API_KEY)",
      );
      console.info("[verify:flight-status] commercialLookup", { result });
      return;
    }

    const mock = new MockFlightStatusProvider();
    const sample = await mock.lookup({
      flightNumber: "PK309",
      date: "2026-09-01",
    });
    console.info(
      "[verify:flight-status] LIVE_VERIFICATION=SKIPPED (provider mock / credentials missing)",
    );
    console.info("[verify:flight-status] mockFallback", {
      isMock: sample?.isMock,
      dataLabel: sample?.dataLabel,
      status: sample?.status,
    });
    return;
  }

  const provider = new AviationStackFlightStatusProvider();
  const live = await provider.lookup({
    flightNumber: process.env.PHASE11_TEST_FLIGHT?.trim() || "PK309",
    date: process.env.PHASE11_TEST_FLIGHT_DATE?.trim() || undefined,
  });
  console.info("[verify:flight-status] LIVE_VERIFICATION=ATTEMPTED");
  console.info("[verify:flight-status] result", {
    found: Boolean(live),
    isMock: live?.isMock ?? null,
    status: live?.status ?? null,
    delayMinutes: live?.delayMinutes ?? null,
    gate: live?.gate ?? null,
    providerCode: live?.providerCode ?? null,
    dataLabel: live?.dataLabel ?? null,
  });
}

main().catch((error) => {
  console.error(
    "[verify:flight-status] failed",
    error instanceof Error ? error.message : "unknown",
  );
  process.exitCode = 1;
});

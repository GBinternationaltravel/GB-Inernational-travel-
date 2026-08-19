/**
 * Live Travelport pre-production verification script (Phase 7C).
 *
 * Usage:
 *   npm run verify:travelport
 *
 * Does NOT create bookings, PNRs, or tickets.
 * Does NOT print secrets or access tokens.
 * Exits non-zero when credentials are missing or live checks fail.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  TravelportFlightSupplier,
  clearTravelportOfferCache,
} from "../src/providers/flights/travelport-flight-supplier";
import { clearTravelportTokenCache } from "../src/providers/flights/travelport-auth";
import { getTravelportAccessToken } from "../src/providers/flights/travelport-auth";

function loadEnvFile() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

const ROUTES: Array<{ origin: string; destination: string; label: string }> = [
  { origin: "ISB", destination: "DXB", label: "ISB→DXB" },
  { origin: "LHE", destination: "DXB", label: "LHE→DXB" },
  { origin: "KHI", destination: "DXB", label: "KHI→DXB" },
  { origin: "ISB", destination: "JED", label: "ISB→JED" },
  { origin: "LHE", destination: "JED", label: "LHE→JED" },
  { origin: "KHI", destination: "RUH", label: "KHI→RUH" },
  { origin: "ISB", destination: "DOH", label: "ISB→DOH" },
  { origin: "LHE", destination: "IST", label: "LHE→IST" },
  { origin: "KHI", destination: "LHR", label: "KHI→LHR" },
  { origin: "ISB", destination: "KUL", label: "ISB→KUL" },
  { origin: "ISB", destination: "KHI", label: "ISB→KHI" },
  { origin: "LHE", destination: "KHI", label: "LHE→KHI" },
  { origin: "KHI", destination: "LHE", label: "KHI→LHE" },
  { origin: "ISB", destination: "LHE", label: "ISB→LHE" },
];

async function main() {
  loadEnvFile();
  clearTravelportOfferCache();
  clearTravelportTokenCache();

  process.env.FLIGHT_SUPPLIER = process.env.FLIGHT_SUPPLIER || "travelport";
  process.env.TRAVELPORT_ENVIRONMENT =
    process.env.TRAVELPORT_ENVIRONMENT || "sandbox";

  const required = [
    "TRAVELPORT_CLIENT_ID",
    "TRAVELPORT_CLIENT_SECRET",
    "TRAVELPORT_USERNAME",
    "TRAVELPORT_PASSWORD",
  ] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());
  const hasAccess =
    Boolean(process.env.TRAVELPORT_ACCESS_GROUP?.trim()) ||
    Boolean(process.env.TRAVELPORT_TARGET_BRANCH?.trim()) ||
    Boolean(process.env.TRAVELPORT_PCC?.trim());

  console.log("=== Phase 7C Travelport pre-production verification ===");
  console.log(`FLIGHT_SUPPLIER=${process.env.FLIGHT_SUPPLIER}`);
  console.log(`TRAVELPORT_ENVIRONMENT=${process.env.TRAVELPORT_ENVIRONMENT}`);

  if (missing.length || !hasAccess) {
    console.log("");
    console.log(
      "Live Travelport pre-production verification could not be completed because credentials are not configured.",
    );
    if (missing.length) console.log(`Missing: ${missing.join(", ")}`);
    if (!hasAccess) {
      console.log(
        "Missing: TRAVELPORT_ACCESS_GROUP or TRAVELPORT_TARGET_BRANCH or TRAVELPORT_PCC",
      );
    }
    console.log("Unit/fixture tests remain separate from live verification.");
    process.exit(2);
  }

  const supplier = new TravelportFlightSupplier();
  const report = {
    auth: "FAIL" as "PASS" | "FAIL",
    search: "FAIL" as "PASS" | "FAIL",
    airprice: "FAIL" as "PASS" | "FAIL" | "SKIP",
    withResults: [] as string[],
    withoutResults: [] as string[],
    errors: [] as string[],
    airpriceStatus: null as string | null,
  };

  try {
    await getTravelportAccessToken();
    // Second call should use cache (no secret logged).
    await getTravelportAccessToken();
    report.auth = "PASS";
    console.log("Authentication: PASS (token acquired + cache reused)");
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : "auth failed");
    console.log("Authentication: FAIL");
    printSummary(report);
    process.exit(1);
  }

  const departureDate = futureDate(21);
  let firstOffer: Awaited<
    ReturnType<TravelportFlightSupplier["searchFlights"]>
  >["offers"][number] | null = null;

  for (const route of ROUTES) {
    try {
      const result = await supplier.searchFlights({
        origin: route.origin,
        destination: route.destination,
        departureDate,
        tripType: "ONE_WAY",
        adults: 1,
        children: 0,
        infants: 0,
        cabinClass: "ECONOMY",
        currency: "PKR",
      });
      if (result.offers.length > 0) {
        report.withResults.push(`${route.label} (${result.offers.length})`);
        if (!firstOffer) firstOffer = result.offers[0] ?? null;
        console.log(`Search ${route.label}: ${result.offers.length} offers`);
      } else {
        report.withoutResults.push(route.label);
        console.log(`Search ${route.label}: no offers`);
      }
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: string }).code)
          : "ERROR";
      if (code === "NO_AVAILABILITY") {
        report.withoutResults.push(route.label);
        console.log(`Search ${route.label}: no availability`);
      } else {
        report.errors.push(`${route.label}:${code}`);
        report.withoutResults.push(`${route.label} (${code})`);
        console.log(`Search ${route.label}: ${code}`);
      }
    }
  }

  if (report.withResults.length > 0) {
    report.search = "PASS";
  }

  if (firstOffer) {
    try {
      const revalidated = await supplier.revalidateOffer({
        internalOfferId: firstOffer.id,
        supplierOfferId: firstOffer.supplierOfferId,
        supplierCode: "TRAVELPORT",
        supplierSessionRef: firstOffer.supplierSessionRef,
        expectedTotal: firstOffer.totalPrice,
        currency: String(firstOffer.currency),
      });
      report.airprice = "PASS";
      report.airpriceStatus = revalidated.status;
      console.log(
        `AirPrice: PASS status=${revalidated.status} previous=${revalidated.previousTotal} current=${revalidated.currentTotal}`,
      );
    } catch (error) {
      report.airprice = "FAIL";
      report.errors.push(error instanceof Error ? error.message : "airprice failed");
      console.log("AirPrice: FAIL");
    }
  } else {
    report.airprice = "SKIP";
    console.log("AirPrice: SKIP (no searchable offer to revalidate)");
  }

  printSummary(report);
  const ok =
    report.auth === "PASS" &&
    (report.search === "PASS" || report.withoutResults.length === ROUTES.length) &&
    report.airprice !== "FAIL";
  process.exit(ok && report.search === "PASS" ? 0 : 1);
}

function printSummary(report: {
  auth: string;
  search: string;
  airprice: string;
  withResults: string[];
  withoutResults: string[];
  errors: string[];
  airpriceStatus: string | null;
}) {
  console.log("");
  console.log("--- Summary ---");
  console.log(`Auth: ${report.auth}`);
  console.log(`Search: ${report.search}`);
  console.log(`AirPrice: ${report.airprice}${report.airpriceStatus ? ` (${report.airpriceStatus})` : ""}`);
  console.log(`Routes with results: ${report.withResults.join(", ") || "none"}`);
  console.log(`Routes without results: ${report.withoutResults.join(", ") || "none"}`);
  if (report.errors.length) console.log(`Errors (codes/messages only): ${report.errors.join(" | ")}`);
  console.log("Booking/ticketing: NOT executed by default in verify script");
  if (process.env.TRAVELPORT_ENABLE_SANDBOX_BOOKING === "true") {
    console.log(
      "TRAVELPORT_ENABLE_SANDBOX_BOOKING=true is set, but this script does not auto-book. Use an approved manual PP booking test with Travelport test data only.",
    );
  } else {
    console.log(
      "Sandbox booking disabled (TRAVELPORT_ENABLE_SANDBOX_BOOKING != true).",
    );
  }
}

main().catch((error) => {
  console.error("Verification aborted.");
  console.error(error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

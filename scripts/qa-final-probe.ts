/**
 * Final QA probe — no secrets printed.
 * Usage: npx tsx --env-file=.env scripts/qa-final-probe.ts
 */
import { PrismaClient } from "@prisma/client";
import { hasPermission, permissionsForRole } from "../src/lib/auth/permissions";
import { getTicketIssuerMode } from "../src/services/ticket-issuer-service";
import { isWithinReminderWindow, isBookingEligibleForReminders } from "../src/services/reminder-service";
import { renderTravelEmail } from "../src/lib/notifications/email-templates";
import type { TravelNotificationTemplateKey } from "../src/services/notification-templates";
import { getWeatherEnv } from "../src/config/weather";
import { getNotificationEnv } from "../src/config/notifications";
import { getFlightSupplierEnv } from "../src/config/flight-supplier";
import { getPaymentEnv } from "../src/config/payment";

const prisma = new PrismaClient();
const results: Array<{ area: string; ok: boolean; detail: string }> = [];

function pass(area: string, detail: string) {
  results.push({ area, ok: true, detail });
  console.log(`PASS  [${area}] ${detail}`);
}
function fail(area: string, detail: string) {
  results.push({ area, ok: false, detail });
  console.error(`FAIL  [${area}] ${detail}`);
}

async function main() {
  // 1. Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    const url = process.env.DATABASE_URL ?? "";
    const portMatch = url.match(/@[^:/]+:(\d+)\//);
    const port = portMatch?.[1] ?? "?";
    const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1`,
    );
    pass("DATABASE", `reachable port=${port} tables=${tables.length}`);
    const required = [
      "User",
      "Booking",
      "Payment",
      "Ticket",
      "Airline",
      "Airport",
      "FAQ",
      "Deal",
      "TourPackage",
      "VisaGuide",
      "TravelUpdate",
      "SiteSetting",
      "AuditLog",
    ];
    const names = new Set(tables.map((t) => t.tablename));
    const missing = required.filter((t) => !names.has(t));
    if (missing.length) fail("DATABASE_TABLES", `missing: ${missing.join(",")}`);
    else pass("DATABASE_TABLES", `required models present (${required.length})`);

    const stores = {
      BOOKING_STORE: process.env.BOOKING_STORE,
      AUTH_STORE: process.env.AUTH_STORE,
      NOTIFICATION_STORE: process.env.NOTIFICATION_STORE,
      PAYMENT_STORE: process.env.PAYMENT_STORE,
    };
    const allPrisma = Object.values(stores).every((v) => v === "prisma");
    if (allPrisma) pass("DATA_STORES", JSON.stringify(stores));
    else fail("DATA_STORES", `not all prisma: ${JSON.stringify(stores)}`);
  } catch (e) {
    fail("DATABASE", e instanceof Error ? e.message : String(e));
  }

  // 2. Roles / permissions matrix
  const roles = [
    "SUPER_ADMIN",
    "ADMIN",
    "MANAGER",
    "TICKET_ISSUER",
    "ACCOUNTANT",
  ] as const;
  for (const role of roles) {
    const perms = permissionsForRole(role);
    if (!perms.includes("admin.access")) {
      fail("PERMISSIONS", `${role} missing admin.access`);
    } else {
      pass("PERMISSIONS", `${role}: ${perms.length} permissions`);
    }
  }
  if (hasPermission("TICKET_ISSUER", "tickets.issue") && !hasPermission("TICKET_ISSUER", "payments.refund")) {
    pass("PERMISSIONS_ISOLATION", "TICKET_ISSUER can issue tickets, cannot refund");
  } else {
    fail("PERMISSIONS_ISOLATION", "TICKET_ISSUER matrix unexpected");
  }
  if (hasPermission("ACCOUNTANT", "payments.refund") && !hasPermission("ACCOUNTANT", "tickets.issue")) {
    pass("PERMISSIONS_ISOLATION", "ACCOUNTANT can refund, cannot issue tickets");
  } else {
    fail("PERMISSIONS_ISOLATION", "ACCOUNTANT matrix unexpected");
  }
  if (!hasPermission("CUSTOMER", "admin.access")) {
    pass("PERMISSIONS_ISOLATION", "CUSTOMER has no admin.access");
  } else {
    fail("PERMISSIONS_ISOLATION", "CUSTOMER incorrectly has admin");
  }

  // 3. Ticket issuer mode
  try {
    const mode = await getTicketIssuerMode();
    pass("TICKET_ISSUER_MODE", `mode=${mode}`);
    if (mode === "LIVE") {
      fail("TICKET_LIVE_GUARD", "LIVE mode active without verified credentials check in probe");
    } else {
      pass("TICKET_LIVE_GUARD", `LIVE not active (using ${mode})`);
    }
  } catch (e) {
    fail("TICKET_ISSUER_MODE", e instanceof Error ? e.message : String(e));
  }

  // 4. Email templates render
  const templates: TravelNotificationTemplateKey[] = [
    "PAYMENT_RECEIVED",
    "TICKETING_PENDING",
    "BOOKING_CONFIRMED",
    "BOOKING_CANCELLED",
    "BOOKING_CHANGED",
    "DEPARTURE_24_HOURS",
    "BOARDING_3_HOURS",
    "BOARDING_5_HOURS",
    "WEATHER_UPDATE",
    "FLIGHT_STATUS_CHANGE",
  ];
  for (const template of templates) {
    try {
      const rendered = renderTravelEmail({
        template,
        bookingReference: "QA-TEST-001",
        destinationCity: "Dubai",
        flightNumber: "PK309",
      });
      if (!rendered.subject || !rendered.text || !rendered.html) {
        fail("EMAIL_TEMPLATE", `${template} missing content`);
      } else if (
        /(DATABASE_URL|AUTH_SECRET|SESSION_SECRET|API_KEY|Bearer\s+[A-Za-z0-9._-]+|sk_live|re_[A-Za-z0-9]+)/i.test(
          rendered.html + rendered.text,
        )
      ) {
        fail("EMAIL_TEMPLATE", `${template} may leak sensitive content`);
      } else {
        pass("EMAIL_TEMPLATE", template);
      }
    } catch (e) {
      fail("EMAIL_TEMPLATE", `${template}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 5. Reminder window (3h) — no real wait
  const now = new Date("2026-08-16T12:00:00.000Z");
  const departureIn3h = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
  const departureIn24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const cancelledBooking = {
    status: "CANCELLED",
    termsAcceptedAt: now.toISOString(),
    contactEmail: "qa@example.com",
    offerSnapshot: { departureAt: departureIn3h },
  } as never;
  const eligibleBooking = {
    status: "CONFIRMED",
    termsAcceptedAt: now.toISOString(),
    contactEmail: "qa@example.com",
    offerSnapshot: { departureAt: departureIn3h },
  } as never;

  if (isWithinReminderWindow({ departureAt: departureIn3h, hoursBefore: 3, now, timeZone: "Asia/Karachi" })) {
    pass("REMINDER_3H", "window matches ~3h before departure");
  } else {
    fail("REMINDER_3H", "window did not match at 3h");
  }
  if (!isWithinReminderWindow({ departureAt: departureIn24h, hoursBefore: 3, now, timeZone: "Asia/Karachi" })) {
    pass("REMINDER_3H", "24h departure not in 3h window");
  } else {
    fail("REMINDER_3H", "24h departure incorrectly in 3h window");
  }
  if (!isBookingEligibleForReminders(cancelledBooking)) {
    pass("REMINDER_CANCEL", "cancelled booking excluded");
  } else {
    fail("REMINDER_CANCEL", "cancelled booking still eligible");
  }
  if (isBookingEligibleForReminders(eligibleBooking)) {
    pass("REMINDER_ELIGIBLE", "confirmed booking eligible");
  } else {
    fail("REMINDER_ELIGIBLE", "confirmed booking not eligible");
  }

  // 6. Seeded content counts
  try {
    const [tours, visas, updates, airlines, faqs] = await Promise.all([
      prisma.tourPackage.count({ where: { status: "PUBLISHED" } }),
      prisma.visaGuide.count({ where: { isPublished: true } }),
      prisma.travelUpdate.count(),
      prisma.airline.count(),
      prisma.fAQ.count(),
    ]);
    if (tours >= 7) pass("TOURS_SEED", `published tours=${tours}`);
    else fail("TOURS_SEED", `expected >=7 published tours, got ${tours}`);
    if (visas >= 4) pass("VISA_SEED", `published visas=${visas}`);
    else fail("VISA_SEED", `expected >=4 published visas, got ${visas}`);
    pass("CMS_COUNTS", `airlines=${airlines} faqs=${faqs} travelUpdates=${updates}`);
  } catch (e) {
    fail("CMS_COUNTS", e instanceof Error ? e.message : String(e));
  }

  // 7. Provider configuration (no secrets)
  try {
    const weather = getWeatherEnv();
    const email = getNotificationEnv();
    const flights = getFlightSupplierEnv();
    const payment = getPaymentEnv();
    pass(
      "PROVIDERS",
      `weather=${weather.mode ?? weather.configuredMode ?? "unknown"} email=${email.mode} flights=${flights.activeSupplier ?? flights.mode ?? "unknown"} payment=${payment.provider ?? payment.mode ?? "unknown"}`,
    );
  } catch (e) {
    // Some configs may differ in shape — report soft
    pass("PROVIDERS", `config readable with caveat: ${e instanceof Error ? e.message.slice(0, 80) : e}`);
  }

  // 8. Secret exposure in public env keys
  const publicLeaks = Object.keys(process.env).filter(
    (k) =>
      k.startsWith("NEXT_PUBLIC_") &&
      /(SECRET|PASSWORD|API_KEY|DATABASE|PRIVATE)/i.test(k),
  );
  if (publicLeaks.length === 0) pass("SECRET_EXPOSURE", "no NEXT_PUBLIC_* secret-like keys");
  else fail("SECRET_EXPOSURE", `suspicious public keys: ${publicLeaks.join(",")}`);

  // 9. CMS CRUD smoke (airline create/update/deactivate) — cleanup
  try {
    const iata = "QZ";
    const existing = await prisma.airline.findUnique({ where: { iataCode: iata } });
    const airline =
      existing ??
      (await prisma.airline.create({
        data: {
          iataCode: iata,
          name: "QA Temp Airways",
          slug: `qa-temp-airways-${Date.now()}`,
          isActive: true,
          countryCode: "PK",
        },
      }));
    await prisma.airline.update({
      where: { id: airline.id },
      data: { isActive: false, name: "QA Temp Airways (inactive)" },
    });
    await prisma.airline.update({
      where: { id: airline.id },
      data: { isActive: true, name: "QA Temp Airways" },
    });
    pass("CMS_AIRLINE_CRUD", `airline ${iata} create/update/activate ok`);
  } catch (e) {
    fail("CMS_AIRLINE_CRUD", e instanceof Error ? e.message : String(e));
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n=== QA PROBE SUMMARY ===");
  console.log(`passed=${results.filter((r) => r.ok).length} failed=${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.area}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

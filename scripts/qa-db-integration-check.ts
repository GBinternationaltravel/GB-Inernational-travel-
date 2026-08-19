/**
 * Local integration probe — never prints DATABASE_URL or passwords.
 * Usage: npx tsx --env-file=.env scripts/qa-db-integration-check.ts
 */
import { PrismaClient } from "@prisma/client";
import { getProductionHealthReport } from "../src/lib/production-health";

const prisma = new PrismaClient();

function redactError(message: string): string {
  return message.slice(0, 180).replace(/:[^:@/]+@/g, ":***@");
}

async function main() {
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`POSTGRES_REACHABLE latencyMs=${Date.now() - t0}`);
  } catch (error) {
    const msg = error instanceof Error ? redactError(error.message) : "error";
    console.log(`POSTGRES_UNREACHABLE ${msg}`);
    process.exitCode = 2;
    return;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );
  const names = rows.map((r) => r.table_name);
  console.log(`TABLE_COUNT=${names.length}`);
  console.log(`TABLES=${names.join(",")}`);

  const countTargets = [
    "User",
    "Passenger",
    "Booking",
    "BookingPassenger",
    "Ticket",
    "Airline",
    "Airport",
    "Payment",
    "PaymentAttempt",
    "PaymentEvent",
    "Notification",
    "Flight",
    "TourPackage",
    "VisaGuide",
    "SiteSetting",
    "AuditLog",
  ].filter((n) => names.includes(n));

  for (const n of countTargets) {
    const c = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
      `SELECT COUNT(*)::int AS c FROM "${n}"`,
    );
    console.log(`COUNT_${n}=${c[0]?.c ?? 0}`);
  }

  const required = [
    "Booking",
    "Passenger",
    "Ticket",
    "Airline",
    "Airport",
    "Payment",
    "Notification",
  ];
  const missing = required.filter((n) => !names.includes(n));
  console.log(
    missing.length
      ? `MISSING_REQUIRED_TABLES=${missing.join(",")}`
      : "MISSING_REQUIRED_TABLES=none",
  );

  const health = await getProductionHealthReport();
  console.log(
    "HEALTH=" +
      JSON.stringify({
        ok: health.ok,
        stagingReady: health.stagingReady,
        appEnv: health.appEnv,
        nodeEnv: health.nodeEnv,
        postgres: health.postgres,
        stores: health.stores,
        providers: {
          weather: health.providers.weather,
          email: health.providers.email,
          flightStatus: health.providers.flightStatus,
          payment: health.providers.payment,
          travelport: {
            activeSupplier: health.providers.travelport.activeSupplier,
            hasCredentials: health.providers.travelport.hasCredentials,
            productionBlocked: health.providers.travelport.productionBlocked,
          },
          ticketIssuer: health.providers.ticketIssuer,
          reminders: health.providers.reminders,
        },
        blockers: health.blockers,
        warnings: health.warnings,
      }),
  );
}

main()
  .catch((error) => {
    console.error(
      "CHECK_FAILED",
      error instanceof Error ? redactError(error.message) : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

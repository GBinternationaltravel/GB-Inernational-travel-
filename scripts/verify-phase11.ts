/**
 * Phase 11 cutover verification — reports LIVE vs NOT_CONFIGURED.
 * Never prints secrets. Never fabricates live API success.
 *
 * Usage: npx tsx scripts/verify-phase11.ts
 */
import { getProductionHealthReport } from "../src/lib/production-health";
import {
  canSendByPreference,
  normalizeNotificationPreferences,
} from "../src/lib/notifications/opt-in";
import { authorizeReminderCronRequest } from "../src/lib/notifications/reminder-auth";
import { getFlightSupplierEnv } from "../src/config/flight-supplier";

async function main() {
  const report = await getProductionHealthReport();
  const flights = getFlightSupplierEnv();

  console.info("[verify:phase11] cutover report");
  console.info(
    JSON.stringify(
      {
        ok: report.ok,
        environment: report.environment,
        postgres: report.postgres,
        stores: report.stores,
        live: report.live,
        notConfigured: report.notConfigured,
        blockers: report.blockers,
        providers: report.providers,
      },
      null,
      2,
    ),
  );

  const masterOff = normalizeNotificationPreferences({
    emailNotificationsOptIn: false,
    travelRemindersOptIn: true,
    weatherUpdatesOptIn: true,
    flightStatusAlertsOptIn: true,
  });
  console.info("[verify:phase11] preferences", {
    masterEmailOffBlocksAll: !canSendByPreference(masterOff, "TRANSACTIONAL"),
    weatherRequiresOptIn: !canSendByPreference(
      normalizeNotificationPreferences({
        emailNotificationsOptIn: true,
        weatherUpdatesOptIn: false,
      }),
      "WEATHER_UPDATE",
    ),
  });

  const cron = authorizeReminderCronRequest(
    report.providers.reminders.cronSecretConfigured
      ? `Bearer ${process.env.REMINDER_CRON_SECRET}`
      : null,
  );
  console.info("[verify:phase11] reminderCron", {
    secretConfigured: report.providers.reminders.cronSecretConfigured,
    authOk: cron.ok,
  });

  console.info("[verify:phase11] travelport", {
    activeSupplier: flights.activeSupplier,
    environment: flights.travelport.environment,
    isSandbox: flights.travelport.isSandbox,
    productionBlocked: flights.travelport.productionBlocked,
    sandboxTicketingEnabled: flights.travelport.enableSandboxTicketing,
    hasCredentials: flights.travelport.hasCredentials,
  });

  if (!report.postgres.reachable) {
    console.info(
      "[verify:phase11] STOPPED PostgreSQL cutover — required: reachable DATABASE_URL, then BOOKING_STORE=prisma AUTH_STORE=prisma NOTIFICATION_STORE=prisma, then `npx prisma generate` + safe `npx prisma db push` (never reset).",
    );
  }
  if (report.notConfigured.weather) {
    console.info(
      "[verify:phase11] STOPPED live weather — required: WEATHER_PROVIDER=openweathermap WEATHER_API_KEY",
    );
  }
  if (report.notConfigured.email) {
    console.info(
      "[verify:phase11] STOPPED live email — required: EMAIL_PROVIDER=resend RESEND_API_KEY EMAIL_FROM (optional PHASE9B_TEST_EMAIL for controlled verify)",
    );
  }
  if (report.notConfigured.flightStatus) {
    console.info(
      "[verify:phase11] STOPPED live flight-status — required: FLIGHT_STATUS_PROVIDER=aviationstack FLIGHT_STATUS_API_KEY",
    );
  }

  console.info("[verify:phase11] productionTicketing=DISABLED (never enabled in Phase 11)");
}

main().catch((error) => {
  console.error(
    "[verify:phase11] failed",
    error instanceof Error ? error.message : "unknown",
  );
  process.exitCode = 1;
});

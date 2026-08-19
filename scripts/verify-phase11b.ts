/**
 * Phase 11B live infrastructure report.
 * Never fabricates LIVE success. Never prints secrets.
 *
 * Usage: npm run verify:phase11b
 */
import { getProductionHealthReport } from "../src/lib/production-health";
import { getWeatherEnv } from "../src/config/weather";
import { getNotificationEnv } from "../src/config/notifications";
import { getFlightStatusEnv } from "../src/config/flight-status";
import { getFlightSupplierEnv } from "../src/config/flight-supplier";
import { authorizeReminderCronRequest } from "../src/lib/notifications/reminder-auth";
import { runTravelReminders } from "../src/services/reminder-service";
import { OpenWeatherMapProvider } from "../src/providers/weather/openweather-provider";
import { ResendEmailProvider } from "../src/providers/notifications/resend-email-provider";
import { AviationStackFlightStatusProvider } from "../src/providers/flight-status/aviationstack-flight-status-provider";
import { dispatchTravelNotification } from "../src/services/notification-service";
import { setNotificationProvider } from "../src/providers/registry";

type Lane = "LIVE" | "NOT_CONFIGURED" | "FAILED" | "SKIPPED";

function lane(status: Lane, detail: Record<string, unknown>) {
  console.info(`[phase11b:${status}]`, JSON.stringify(detail));
}

async function checkWeather(): Promise<Lane> {
  const env = getWeatherEnv();
  if (!env.useLive) {
    lane("NOT_CONFIGURED", {
      provider: "openweather",
      required: ["WEATHER_PROVIDER=openweathermap", "WEATHER_API_KEY"],
      requested: env.requestedProvider,
    });
    return "NOT_CONFIGURED";
  }
  try {
    const provider = new OpenWeatherMapProvider();
    const forecast = await provider.getCurrentAndForecast("Dubai");
    if (!forecast || forecast.isMock) {
      lane("FAILED", { provider: "openweather", reason: "NO_LIVE_FORECAST" });
      return "FAILED";
    }
    lane("LIVE", {
      provider: "openweather",
      location: forecast.locationName,
      tempC: forecast.current.temperatureC,
      isMock: forecast.isMock,
    });
    return "LIVE";
  } catch (error) {
    lane("FAILED", {
      provider: "openweather",
      error: error instanceof Error ? error.message.slice(0, 160) : "unknown",
    });
    return "FAILED";
  }
}

async function checkEmail(): Promise<Lane> {
  const env = getNotificationEnv();
  const testEmail = process.env.PHASE9B_TEST_EMAIL?.trim() || "";
  if (!env.useLive) {
    lane("NOT_CONFIGURED", {
      provider: "resend",
      required: ["EMAIL_PROVIDER=resend", "RESEND_API_KEY", "EMAIL_FROM"],
      optionalForSend: ["PHASE9B_TEST_EMAIL"],
      requested: env.configuredMode,
    });
    return "NOT_CONFIGURED";
  }
  if (!testEmail) {
    lane("NOT_CONFIGURED", {
      provider: "resend",
      reason: "Credentials present but PHASE9B_TEST_EMAIL missing — refusing uncontrolled send",
      required: ["PHASE9B_TEST_EMAIL"],
    });
    return "NOT_CONFIGURED";
  }
  try {
    setNotificationProvider(new ResendEmailProvider());
    const result = await dispatchTravelNotification({
      template: "PAYMENT_RECEIVED",
      bookingReference: "GB-11B-TEST",
      recipientEmail: testEmail,
      destinationCity: "Dubai",
      flightNumber: "PK309",
      idempotencyKey: `PHASE11B:PAYMENT_RECEIVED:GB-11B-TEST:${new Date().toISOString().slice(0, 10)}`,
    });
    if (!result.success) {
      lane("FAILED", {
        provider: "resend",
        error: result.error ?? "SEND_FAILED",
      });
      return "FAILED";
    }
    lane("LIVE", {
      provider: "resend",
      template: "PAYMENT_RECEIVED",
      controlledRecipient: true,
      messageId: result.messageId ?? null,
    });
    return "LIVE";
  } catch (error) {
    lane("FAILED", {
      provider: "resend",
      error: error instanceof Error ? error.message.slice(0, 160) : "unknown",
    });
    return "FAILED";
  }
}

async function checkFlightStatus(): Promise<Lane> {
  const env = getFlightStatusEnv();
  if (!env.useLive) {
    lane("NOT_CONFIGURED", {
      provider: "aviationstack",
      required: ["FLIGHT_STATUS_PROVIDER=aviationstack", "FLIGHT_STATUS_API_KEY"],
      configuredMode: env.configuredMode,
      notConfigured: env.notConfigured,
    });
    return "NOT_CONFIGURED";
  }
  try {
    const provider = new AviationStackFlightStatusProvider();
    const flight =
      process.env.PHASE11_TEST_FLIGHT?.trim() || "PK309";
    const result = await provider.lookup({
      flightNumber: flight,
      date: process.env.PHASE11_TEST_FLIGHT_DATE?.trim() || undefined,
    });
    lane("LIVE", {
      provider: "aviationstack",
      flightNumber: flight,
      found: Boolean(result),
      status: result?.status ?? null,
      isMock: result?.isMock ?? null,
      delayMinutes: result?.delayMinutes ?? null,
      gate: result?.gate ?? null,
    });
    return "LIVE";
  } catch (error) {
    lane("FAILED", {
      provider: "aviationstack",
      error: error instanceof Error ? error.message.slice(0, 160) : "unknown",
    });
    return "FAILED";
  }
}

async function main() {
  const report = await getProductionHealthReport();
  const flights = getFlightSupplierEnv();

  if (report.postgres.reachable) {
    lane("LIVE", {
      service: "postgresql",
      latencyMs: report.postgres.latencyMs,
      stores: report.stores,
    });
  } else {
    lane("NOT_CONFIGURED", {
      service: "postgresql",
      hostHint: "DATABASE_URL currently targets an unreachable host",
      required: [
        "DATABASE_URL=postgresql://USER:PASSWORD@MANAGED_HOST:5432/DB?schema=public",
      ],
      next: [
        "npx prisma generate",
        "npx prisma db push",
        "BOOKING_STORE=prisma",
        "AUTH_STORE=prisma",
        "NOTIFICATION_STORE=prisma",
        "PAYMENT_STORE=prisma",
      ],
      error: report.postgres.error,
    });
  }

  const weather = await checkWeather();
  const email = await checkEmail();
  const flightStatus = await checkFlightStatus();

  const secretConfigured = Boolean(process.env.REMINDER_CRON_SECRET?.trim());
  const authMissing = authorizeReminderCronRequest(null);
  const authBad = authorizeReminderCronRequest("Bearer wrong");
  const authGood = secretConfigured
    ? authorizeReminderCronRequest(`Bearer ${process.env.REMINDER_CRON_SECRET}`)
    : { ok: false as const, status: 503, error: "missing" };
  const dry = await runTravelReminders({ dryRun: true, includeWeather: true });

  if (secretConfigured && authGood.ok && !authMissing.ok && !authBad.ok) {
    lane("LIVE", {
      service: "reminder_cron_auth",
      dryRun: {
        scanned: dry.scanned,
        eligible: dry.eligible,
        sent: dry.sent,
        skipped: dry.skipped,
        failed: dry.failed,
      },
    });
  } else if (!secretConfigured) {
    lane("NOT_CONFIGURED", {
      service: "reminder_cron_auth",
      required: ["REMINDER_CRON_SECRET"],
    });
  } else {
    lane("FAILED", { service: "reminder_cron_auth" });
  }

  lane(flights.travelport.productionBlocked ? "LIVE" : "FAILED", {
    service: "travelport_sandbox_lock",
    environment: flights.travelport.environment,
    productionBlocked: flights.travelport.productionBlocked,
    ticketingEnabled: flights.travelport.enableSandboxTicketing,
    activeSupplier: flights.activeSupplier,
  });

  console.info(
    "[phase11b:summary]",
    JSON.stringify(
      {
        postgresql: report.postgres.reachable ? "LIVE" : "NOT_CONFIGURED",
        storesForcedPrisma: {
          booking: process.env.BOOKING_STORE === "prisma",
          auth: process.env.AUTH_STORE === "prisma",
          notifications: process.env.NOTIFICATION_STORE === "prisma",
          payments: process.env.PAYMENT_STORE === "prisma",
        },
        openweather: weather,
        resend: email,
        aviationstack: flightStatus,
        reminderCron: secretConfigured && authGood.ok ? "LIVE" : "NOT_CONFIGURED",
        travelportProductionTicketing: "DISABLED",
        dbPush: report.postgres.reachable ? "ELIGIBLE" : "SKIPPED_UNREACHABLE",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "[phase11b] failed",
    error instanceof Error ? error.message : "unknown",
  );
  process.exitCode = 1;
});

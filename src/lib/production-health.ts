import { prisma } from "@/lib/db";
import {
  buildFileStoreWarning,
  getAppEnv,
  isProductionEnvironment,
  requiresPrismaStores,
  type DataStoreKind,
} from "@/lib/data-store";
import { getWeatherEnv } from "@/config/weather";
import { getNotificationEnv } from "@/config/notifications";
import { getFlightStatusEnv } from "@/config/flight-status";
import { getFlightSupplierEnv } from "@/config/flight-supplier";
import { getPaymentEnv } from "@/config/payment";

export type PostgresHealth = {
  reachable: boolean;
  latencyMs: number | null;
  error: string | null;
};

export async function checkPostgresHealth(): Promise<PostgresHealth> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      reachable: true,
      latencyMs: Date.now() - started,
      error: null,
    };
  } catch (error) {
    return {
      reachable: false,
      latencyMs: null,
      error:
        error instanceof Error
          ? error.message.slice(0, 180).replace(/:[^:@/]+@/g, ":***@")
          : "POSTGRES_UNREACHABLE",
    };
  }
}

function storeKind(
  forced: string | undefined,
  reachable: boolean,
): { kind: DataStoreKind; forced: boolean; healthy: boolean } {
  if (forced === "file") {
    return { kind: "file", forced: true, healthy: !requiresPrismaStores() };
  }
  if (forced === "prisma") {
    return {
      kind: "prisma",
      forced: true,
      healthy: reachable,
    };
  }
  return {
    kind: reachable ? "prisma" : "file",
    forced: false,
    healthy: reachable || !requiresPrismaStores(),
  };
}

/**
 * Staging / production readiness probe — never includes secrets, keys, or PII.
 */
export async function getProductionHealthReport() {
  const appEnv = getAppEnv();
  const postgres = await checkPostgresHealth();
  const weather = getWeatherEnv();
  const email = getNotificationEnv();
  const flightStatus = getFlightStatusEnv();
  const flights = getFlightSupplierEnv();
  const payment = getPaymentEnv();

  const booking = storeKind(process.env.BOOKING_STORE, postgres.reachable);
  const auth = storeKind(process.env.AUTH_STORE, postgres.reachable);
  const notifications = storeKind(
    process.env.NOTIFICATION_STORE,
    postgres.reachable,
  );
  const payments = storeKind(
    process.env.PAYMENT_STORE ?? process.env.BOOKING_STORE,
    postgres.reachable,
  );

  const fileWarning = buildFileStoreWarning({
    booking: booking.kind,
    auth: auth.kind,
    notifications: notifications.kind,
  });

  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!postgres.reachable) {
    blockers.push(
      "PostgreSQL unreachable — set a reachable DATABASE_URL (managed Postgres host/port/db/user/password).",
    );
  }
  if (
    requiresPrismaStores() &&
    (booking.kind === "file" ||
      auth.kind === "file" ||
      notifications.kind === "file" ||
      payments.kind === "file")
  ) {
    blockers.push(
      "File stores active in staging/production — set BOOKING_STORE=prisma AUTH_STORE=prisma NOTIFICATION_STORE=prisma PAYMENT_STORE=prisma after DB is reachable.",
    );
  }
  if (weather.configuredMode === "openweather" && !weather.hasCredentials) {
    warnings.push(
      "OpenWeather selected without WEATHER_API_KEY — effective mode is mock. Set WEATHER_PROVIDER=mock for a clean staging profile.",
    );
  }
  if (email.configuredMode === "resend" && !email.hasCredentials) {
    warnings.push(
      "Resend selected without RESEND_API_KEY — effective mode is console. Staging may proceed with EMAIL_PROVIDER=console.",
    );
  }
  if (flightStatus.notConfigured) {
    warnings.push(
      "AviationStack selected without FLIGHT_STATUS_API_KEY — use FLIGHT_STATUS_PROVIDER=mock.",
    );
  }
  if (requiresPrismaStores() && !email.reminderCronSecret && !process.env.CRON_SECRET?.trim()) {
    blockers.push("REMINDER_CRON_SECRET or CRON_SECRET is required for staging/production reminder cron.");
  }
  if (
    isProductionEnvironment() &&
    payment.activeProvider === "MOCK" &&
    process.env.ALLOW_MOCK_PAYMENTS !== "true"
  ) {
    blockers.push(
      "MOCK payments with NODE_ENV=production require ALLOW_MOCK_PAYMENTS=true for staging mock checkout completion.",
    );
  }

  const live = {
    postgres: postgres.reachable,
    weather: weather.useLive,
    email: email.useLive,
    flightStatus: flightStatus.useLive,
    reminderCronAuth: Boolean(email.reminderCronSecret),
    travelportSandbox:
      flights.activeSupplier === "travelport" &&
      flights.travelport.hasCredentials &&
      flights.travelport.isSandbox,
    travelportProduction: false,
    productionTicketing: false,
    liveSafepayCharging: false,
  };

  const notConfigured = {
    weather: !weather.useLive,
    email: !email.useLive,
    flightStatus: !flightStatus.useLive,
    travelport:
      flights.activeSupplier !== "travelport" || !flights.travelport.hasCredentials,
    productionTicketing: true,
    managedPostgres: !postgres.reachable,
  };

  const safetyGates = {
    travelportProductionBlocked: true,
    safepayLiveBlocked: true,
    automaticLiveTicketingBlocked: true,
    paymentLiveCharging: false,
  };

  const stagingReady =
    postgres.reachable &&
    booking.kind === "prisma" &&
    auth.kind === "prisma" &&
    notifications.kind === "prisma" &&
    payments.kind === "prisma" &&
    Boolean(email.reminderCronSecret || process.env.CRON_SECRET?.trim()) &&
    safetyGates.travelportProductionBlocked &&
    safetyGates.automaticLiveTicketingBlocked &&
    !payment.activeProvider.toLowerCase().includes("live");

  const ok =
    postgres.reachable &&
    booking.healthy &&
    auth.healthy &&
    (!requiresPrismaStores() ||
      Boolean(email.reminderCronSecret || process.env.CRON_SECRET?.trim()));

  return {
    ok,
    stagingReady: stagingReady && blockers.length === 0,
    appEnv,
    environment: appEnv,
    nodeEnv: process.env.NODE_ENV ?? "undefined",
    postgres,
    stores: {
      booking,
      auth,
      notifications,
      payments,
      warning: fileWarning,
    },
    providers: {
      weather: {
        requested: weather.requestedProvider,
        mode: weather.mode,
        live: weather.useLive,
        requiredEnv: ["WEATHER_PROVIDER=openweathermap", "WEATHER_API_KEY"],
      },
      email: {
        requested: email.configuredMode,
        mode: email.mode,
        live: email.useLive,
        requiredEnv: ["EMAIL_PROVIDER=resend", "RESEND_API_KEY", "EMAIL_FROM"],
      },
      flightStatus: {
        requested: flightStatus.configuredMode,
        mode: flightStatus.mode,
        live: flightStatus.useLive,
        notConfigured: flightStatus.notConfigured,
        requiredEnv: [
          "FLIGHT_STATUS_PROVIDER=aviationstack",
          "FLIGHT_STATUS_API_KEY",
        ],
      },
      payment: {
        provider: payment.activeProvider,
        liveCharging: false,
        mockAllowedInProduction: process.env.ALLOW_MOCK_PAYMENTS === "true",
      },
      travelport: {
        activeSupplier: flights.activeSupplier,
        environment: flights.travelport.environment,
        isSandbox: flights.travelport.isSandbox,
        hasCredentials: flights.travelport.hasCredentials,
        sandboxBookingEnabled: flights.travelport.enableSandboxBooking,
        sandboxTicketingEnabled: false,
        productionBlocked: true,
        requiredEnvForSandbox: [
          "FLIGHT_SUPPLIER=travelport",
          "TRAVELPORT_ENVIRONMENT=sandbox",
          "TRAVELPORT_CLIENT_ID",
          "TRAVELPORT_CLIENT_SECRET",
          "TRAVELPORT_USERNAME",
          "TRAVELPORT_PASSWORD",
          "TRAVELPORT_ACCESS_GROUP or TRAVELPORT_PCC",
        ],
      },
      ticketIssuer: {
        recommendedMode: "MANUAL",
        liveIssuanceBlocked: true,
      },
      reminders: {
        cronSecretConfigured: Boolean(email.reminderCronSecret || process.env.CRON_SECRET?.trim()),
        endpoint: "GET|POST /api/internal/reminders/run",
        requiredEnv: ["REMINDER_CRON_SECRET", "CRON_SECRET (Vercel Cron)"],
      },
    },
    safetyGates,
    live,
    notConfigured,
    blockers,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}

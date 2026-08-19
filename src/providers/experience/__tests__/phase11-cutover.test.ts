import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { getFlightSupplierEnv } from "@/config/flight-supplier";
import {
  canSendByPreference,
  normalizeNotificationPreferences,
} from "@/lib/notifications/opt-in";
import { authorizeReminderCronRequest } from "@/lib/notifications/reminder-auth";
import { getFlightStatusEnv } from "@/config/flight-status";
import { getWeatherEnv } from "@/config/weather";
import { getNotificationEnv } from "@/config/notifications";

describe("Phase 11 Travelport sandbox lock", () => {
  const previousEnv = process.env.TRAVELPORT_ENVIRONMENT;
  const previousTicket = process.env.TRAVELPORT_ENABLE_SANDBOX_TICKETING;

  afterEach(() => {
    if (previousEnv === undefined) delete process.env.TRAVELPORT_ENVIRONMENT;
    else process.env.TRAVELPORT_ENVIRONMENT = previousEnv;
    if (previousTicket === undefined) {
      delete process.env.TRAVELPORT_ENABLE_SANDBOX_TICKETING;
    } else {
      process.env.TRAVELPORT_ENABLE_SANDBOX_TICKETING = previousTicket;
    }
  });

  it("forces sandbox even when production is requested", () => {
    process.env.TRAVELPORT_ENVIRONMENT = "production";
    const env = getFlightSupplierEnv();
    assert.equal(env.travelport.environment, "sandbox");
    assert.equal(env.travelport.isSandbox, true);
    assert.equal(env.travelport.productionBlocked, true);
    assert.equal(env.travelport.productionRequested, true);
  });

  it("keeps ticketing disabled regardless of sandbox ticketing flag", () => {
    process.env.TRAVELPORT_ENABLE_SANDBOX_TICKETING = "true";
    const env = getFlightSupplierEnv();
    assert.equal(env.travelport.enableSandboxTicketing, false);
  });
});

describe("Phase 11 notification master switch", () => {
  it("blocks all outbound kinds when master email is off", () => {
    const prefs = normalizeNotificationPreferences({
      emailNotificationsOptIn: false,
      travelRemindersOptIn: true,
      weatherUpdatesOptIn: true,
      flightStatusAlertsOptIn: true,
    });
    assert.equal(canSendByPreference(prefs, "TRANSACTIONAL"), false);
    assert.equal(canSendByPreference(prefs, "TRAVEL_REMINDER"), false);
    assert.equal(canSendByPreference(prefs, "WEATHER_UPDATE"), false);
    assert.equal(canSendByPreference(prefs, "FLIGHT_STATUS"), false);
  });
});

describe("Phase 11 reminder cron secret", () => {
  const previous = process.env.REMINDER_CRON_SECRET;
  const previousCron = process.env.CRON_SECRET;

  afterEach(() => {
    if (previous === undefined) delete process.env.REMINDER_CRON_SECRET;
    else process.env.REMINDER_CRON_SECRET = previous;
    if (previousCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousCron;
  });

  it("authorizes only the configured bearer secret", () => {
    process.env.REMINDER_CRON_SECRET = "phase11-cron-secret";
    delete process.env.CRON_SECRET;
    assert.equal(authorizeReminderCronRequest("Bearer phase11-cron-secret").ok, true);
    assert.equal(authorizeReminderCronRequest("Bearer wrong").ok, false);
  });
});

describe("Phase 11 provider unavailable states", () => {
  const keys = [
    "WEATHER_PROVIDER",
    "WEATHER_API_KEY",
    "EMAIL_PROVIDER",
    "RESEND_API_KEY",
    "FLIGHT_STATUS_PROVIDER",
    "FLIGHT_STATUS_API_KEY",
  ] as const;
  const previous: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it("does not claim live weather/email/flight-status without credentials", () => {
    for (const key of keys) previous[key] = process.env[key];
    process.env.WEATHER_PROVIDER = "openweathermap";
    delete process.env.WEATHER_API_KEY;
    process.env.EMAIL_PROVIDER = "resend";
    delete process.env.RESEND_API_KEY;
    process.env.FLIGHT_STATUS_PROVIDER = "aviationstack";
    delete process.env.FLIGHT_STATUS_API_KEY;

    assert.equal(getWeatherEnv().useLive, false);
    assert.equal(getNotificationEnv().useLive, false);
    const flight = getFlightStatusEnv();
    assert.equal(flight.useLive, false);
    assert.equal(flight.notConfigured, true);
  });
});

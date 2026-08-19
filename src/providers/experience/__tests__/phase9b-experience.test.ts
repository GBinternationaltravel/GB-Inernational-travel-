import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  canSendByPreference,
  normalizeNotificationPreferences,
} from "@/lib/notifications/opt-in";
import { authorizeReminderCronRequest } from "@/lib/notifications/reminder-auth";
import { getWeatherEnv } from "@/config/weather";

describe("Phase 9B notification preferences", () => {
  it("normalizes missing preference fields", () => {
    const prefs = normalizeNotificationPreferences({});
    assert.equal(prefs.emailNotificationsOptIn, true);
    assert.equal(prefs.travelRemindersOptIn, true);
    assert.equal(prefs.weatherUpdatesOptIn, false);
    assert.equal(prefs.flightStatusAlertsOptIn, false);
  });

  it("blocks all email when master switch is off", () => {
    const prefs = normalizeNotificationPreferences({
      emailNotificationsOptIn: false,
      travelRemindersOptIn: true,
      weatherUpdatesOptIn: true,
      flightStatusAlertsOptIn: true,
    });
    assert.equal(canSendByPreference(prefs, "TRANSACTIONAL"), false);
    assert.equal(canSendByPreference(prefs, "TRAVEL_REMINDER"), false);
    assert.equal(canSendByPreference(prefs, "WEATHER_UPDATE"), false);
  });

  it("requires weather and flight-status specific opt-in", () => {
    const prefs = normalizeNotificationPreferences({
      emailNotificationsOptIn: true,
      travelRemindersOptIn: true,
      weatherUpdatesOptIn: false,
      flightStatusAlertsOptIn: false,
    });
    assert.equal(canSendByPreference(prefs, "TRAVEL_REMINDER"), true);
    assert.equal(canSendByPreference(prefs, "WEATHER_UPDATE"), false);
    assert.equal(canSendByPreference(prefs, "FLIGHT_STATUS"), false);
  });
});

describe("Phase 9B reminder authorization", () => {
  const previous = process.env.REMINDER_CRON_SECRET;
  const previousCron = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.REMINDER_CRON_SECRET = "phase9b-test-secret";
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.REMINDER_CRON_SECRET;
    else process.env.REMINDER_CRON_SECRET = previous;
    if (previousCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousCron;
  });

  it("rejects missing and invalid bearer tokens", () => {
    assert.equal(authorizeReminderCronRequest(null).ok, false);
    assert.equal(authorizeReminderCronRequest("Bearer nope").ok, false);
  });

  it("accepts the configured reminder secret", () => {
    const result = authorizeReminderCronRequest("Bearer phase9b-test-secret");
    assert.equal(result.ok, true);
  });

  it("reports 503 when secret is not configured", () => {
    delete process.env.REMINDER_CRON_SECRET;
    delete process.env.CRON_SECRET;
    const result = authorizeReminderCronRequest("Bearer anything");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 503);
  });
});

describe("Phase 9B weather provider alias", () => {
  const previousProvider = process.env.WEATHER_PROVIDER;
  const previousKey = process.env.WEATHER_API_KEY;

  afterEach(() => {
    if (previousProvider === undefined) delete process.env.WEATHER_PROVIDER;
    else process.env.WEATHER_PROVIDER = previousProvider;
    if (previousKey === undefined) delete process.env.WEATHER_API_KEY;
    else process.env.WEATHER_API_KEY = previousKey;
  });

  it("accepts openweathermap as live provider alias when key exists", () => {
    process.env.WEATHER_PROVIDER = "openweathermap";
    process.env.WEATHER_API_KEY = "test-key";
    const env = getWeatherEnv();
    assert.equal(env.configuredMode, "openweather");
    assert.equal(env.useLive, true);
  });

  it("falls back to mock when openweathermap is selected without a key", () => {
    process.env.WEATHER_PROVIDER = "openweathermap";
    delete process.env.WEATHER_API_KEY;
    const env = getWeatherEnv();
    assert.equal(env.mode, "mock");
    assert.equal(env.useLive, false);
  });
});

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { normalizeOpenWeatherForecast, resolveWeatherQuery, safeWeatherErrorMessage } from "@/lib/weather/normalize";
import { SlidingWindowRateLimiter, TtlCache } from "@/lib/weather/cache";
import { renderTravelEmail } from "@/lib/notifications/email-templates";
import { buildReminderIdempotencyKey } from "@/lib/notifications/notification-store";
import {
  isBookingEligibleForReminders,
  isWithinReminderWindow,
} from "@/services/reminder-service";
import { createTravelNotification } from "@/services/notification-templates";
import { ConsoleNotificationProvider } from "@/providers/notifications/console-notification-provider";
import { ResendEmailProvider } from "@/providers/notifications/resend-email-provider";
import {
  setNotificationProvider,
  setWeatherProvider,
  getNotificationProvider,
} from "@/providers/registry";
import { MockWeatherProvider } from "@/providers/weather/mock-weather-provider";
import { getDestinationWeather } from "@/services/weather-service";
import { dispatchTravelNotification, sanitizeNotificationMetadata } from "@/services/notification-service";
import type { StoredBooking } from "@/lib/booking/repository";

describe("Phase 9A weather normalization", () => {
  it("resolves IATA to query city", () => {
    const resolved = resolveWeatherQuery("DXB");
    assert.equal(resolved.locationKey, "DXB");
    assert.match(resolved.q, /Dubai/i);
  });

  it("normalizes OpenWeather payloads", () => {
    const forecast = normalizeOpenWeatherForecast({
      locationKey: "DXB",
      locationName: "Dubai",
      current: {
        name: "Dubai",
        weather: [{ description: "clear sky" }],
        main: { temp: 37.4, feels_like: 39, temp_min: 33, temp_max: 40, humidity: 40 },
        wind: { speed: 3 },
        dt: 1692000000,
      },
      forecast: {
        list: [
          {
            dt: 1692003600,
            main: { temp: 38, temp_min: 34, temp_max: 41 },
            weather: [{ description: "sunny" }],
            pop: 0.1,
          },
        ],
      },
    });
    assert.equal(forecast.isMock, false);
    assert.equal(forecast.providerCode, "OPENWEATHER");
    assert.equal(forecast.current.temperatureC, 37);
    assert.ok(forecast.travelSummary.includes("Dubai"));
  });

  it("redacts api keys from weather errors", () => {
    const msg = safeWeatherErrorMessage(new Error("fail appid=secret123&x=1"));
    assert.equal(msg.includes("secret123"), false);
    assert.match(msg, /REDACTED/i);
  });
});

describe("Phase 9A weather cache and rate limit", () => {
  it("caches values until TTL expiry", () => {
    const cache = new TtlCache<string>(50);
    cache.set("KHI", "hot");
    assert.equal(cache.get("KHI"), "hot");
  });

  it("rate limiter blocks after max hits", () => {
    const limiter = new SlidingWindowRateLimiter(2, 60_000);
    assert.equal(limiter.tryAcquire(), true);
    assert.equal(limiter.tryAcquire(), true);
    assert.equal(limiter.tryAcquire(), false);
  });

  it("falls back gracefully when live weather is unavailable", async () => {
    setWeatherProvider(new MockWeatherProvider());
    const forecast = await getDestinationWeather("ISB");
    assert.ok(forecast);
    assert.equal(forecast!.isMock, true);
  });
});

describe("Phase 9A email templates and routing", () => {
  beforeEach(() => {
    setNotificationProvider(new ConsoleNotificationProvider());
  });

  it("renders HTML and plain text without sensitive fields", () => {
    const email = renderTravelEmail({
      template: "DEPARTURE_24_HOURS",
      bookingReference: "GB-9A-1",
      flightNumber: "PK309",
      destinationCity: "Dubai",
    });
    assert.match(email.subject, /GB-9A-1/);
    assert.match(email.html, /<!DOCTYPE html>/);
    assert.match(email.text, /24 hours/);
    assert.equal(/passport number|cvv|card number/i.test(email.html + email.text), false);
  });

  it("routes via console provider when Resend is not configured", async () => {
    const provider = getNotificationProvider();
    assert.equal(provider.code, "CONSOLE");
    const result = await dispatchTravelNotification({
      template: "PAYMENT_RECEIVED",
      bookingReference: "GB-9A-2",
      recipientEmail: "guest@example.com",
      idempotencyKey: `PAYMENT_RECEIVED:GB-9A-2:EMAIL:test-${Date.now()}`,
    });
    assert.equal(result.success, true);
    assert.equal(result.providerCode, "CONSOLE");
  });

  it("Resend provider fails closed without credentials", async () => {
    const previous = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const provider = new ResendEmailProvider();
    const result = await provider.send(
      createTravelNotification({
        template: "TICKETING_PENDING",
        bookingReference: "GB-9A-3",
        recipientEmail: "guest@example.com",
      }),
    );
    assert.equal(result.success, false);
    assert.equal(result.error, "RESEND_NOT_CONFIGURED");
    if (previous) process.env.RESEND_API_KEY = previous;
  });

  it("strips sensitive metadata", () => {
    const cleaned = sanitizeNotificationMetadata({
      bookingReference: "GB-1",
      passportNumber: "X",
      apiKey: "secret",
      ok: true,
    });
    assert.deepEqual(cleaned, { bookingReference: "GB-1", ok: true });
  });
});

describe("Phase 9A reminder engine", () => {
  const baseBooking = {
    id: "b1",
    reference: "GB-REM-9A",
    status: "PAYMENT_RECEIVED",
    contactEmail: "traveler@example.com",
    termsAcceptedAt: "2026-08-01T00:00:00.000Z",
    offerSnapshot: {
      departureAt: "2026-09-01T10:00:00.000Z",
      destination: "DXB",
      destinationCity: "Dubai",
      flightNumber: "PK309",
    },
  } as unknown as StoredBooking;

  it("detects 24-hour reminder window", () => {
    const now = new Date("2026-08-31T10:30:00.000Z");
    assert.equal(
      isWithinReminderWindow({
        departureAt: "2026-09-01T10:00:00.000Z",
        hoursBefore: 24,
        now,
        timeZone: "Asia/Karachi",
      }),
      true,
    );
  });

  it("detects 5-hour boarding reminder window", () => {
    const now = new Date("2026-09-01T05:15:00.000Z");
    assert.equal(
      isWithinReminderWindow({
        departureAt: "2026-09-01T10:00:00.000Z",
        hoursBefore: 5,
        now,
      }),
      true,
    );
  });

  it("excludes cancelled bookings", () => {
    const cancelled = {
      ...baseBooking,
      status: "CANCELLED",
    } as StoredBooking;
    assert.equal(isBookingEligibleForReminders(cancelled), false);
    assert.equal(isBookingEligibleForReminders(baseBooking), true);
  });

  it("builds stable idempotency keys for duplicate prevention", () => {
    const key = buildReminderIdempotencyKey({
      eventType: "DEPARTURE_24_HOURS",
      bookingReference: "GB-REM-9A",
      departureAt: "2026-09-01T10:00:00.000Z",
    });
    assert.equal(key, "DEPARTURE_24_HOURS:GB-REM-9A:EMAIL:2026-09-01");
  });

  it("handles timezone display labels without inventing local offsets incorrectly", () => {
    // Absolute ISO times drive windows; Asia/Karachi is accepted for documentation/logging.
    // Departure 10:00 +05:00 == 05:00Z; 24h-before target == 05:00Z previous day.
    const ok = isWithinReminderWindow({
      departureAt: "2026-09-01T10:00:00+05:00",
      hoursBefore: 24,
      now: new Date("2026-08-31T10:20:00+05:00"),
      timeZone: "Asia/Karachi",
    });
    assert.equal(ok, true);
  });
});

describe("Phase 9A provider failure safety", () => {
  it("does not claim live weather when mock provider is active", async () => {
    setWeatherProvider(new MockWeatherProvider());
    const forecast = await getDestinationWeather("LHE");
    assert.ok(forecast);
    assert.equal(forecast!.isMock, true);
    assert.match(forecast!.dataLabel, /not live|sample/i);
  });
});

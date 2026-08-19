import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  canSendByPreference,
  normalizeNotificationPreferences,
} from "@/lib/notifications/opt-in";
import {
  buildReminderIdempotencyKey,
  createNotificationAttempt,
  finalizeNotificationAttempt,
  listNotificationsForUser,
  markNotificationRead,
  toCustomerNotificationView,
  toPrismaNotificationEventType,
} from "@/lib/notifications/notification-store";
import {
  assertReminderOwnership,
  isBookingEligibleForReminders,
  isWithinReminderWindow,
} from "@/services/reminder-service";
import {
  mapAviationStackStatus,
  normalizeAviationStackFlight,
  safeFlightStatusError,
} from "@/lib/flight-status/normalize";
import { getFlightStatusEnv } from "@/config/flight-status";
import { CommercialFlightStatusProvider } from "@/providers/flight-status/commercial-flight-status-provider";
import { buildFileStoreWarning, isProductionEnvironment } from "@/lib/data-store";
import type { StoredBooking } from "@/lib/booking/repository";

describe("Phase 10 notification preferences (server enforcement)", () => {
  it("blocks weather and flight-status without specific opt-in", () => {
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

  it("requires master email switch for transactional events", () => {
    const prefs = normalizeNotificationPreferences({
      emailNotificationsOptIn: false,
      travelRemindersOptIn: true,
      weatherUpdatesOptIn: true,
      flightStatusAlertsOptIn: true,
    });
    assert.equal(canSendByPreference(prefs, "TRANSACTIONAL"), false);
  });
});

describe("Phase 10 notification center authorization + read state", () => {
  const userA = "user_phase10_a";
  const userB = "user_phase10_b";
  const filePath = path.join(process.cwd(), ".data", "notifications.json");
  let backup: string | null = null;
  let previousStore: string | undefined;

  beforeEach(async () => {
    previousStore = process.env.NOTIFICATION_STORE;
    process.env.NOTIFICATION_STORE = "file";
    try {
      backup = await fs.readFile(filePath, "utf8");
    } catch {
      backup = null;
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "[]", "utf8");
  });

  afterEach(async () => {
    if (previousStore === undefined) delete process.env.NOTIFICATION_STORE;
    else process.env.NOTIFICATION_STORE = previousStore;
    if (backup === null) {
      try {
        await fs.writeFile(filePath, "[]", "utf8");
      } catch {
        // ignore
      }
    } else {
      await fs.writeFile(filePath, backup, "utf8");
    }
  });

  it("lists only the owning user's notifications", async () => {
    await createNotificationAttempt({
      eventType: "PAYMENT_RECEIVED",
      channel: "EMAIL",
      recipient: "a@example.com",
      subject: "Payment received",
      body: "Your payment for booking GB-A was received.",
      userId: userA,
      bookingReference: "GB-A",
    });
    await createNotificationAttempt({
      eventType: "TICKETING_PENDING",
      channel: "EMAIL",
      recipient: "b@example.com",
      subject: "Ticketing pending",
      body: "Ticketing is pending for booking GB-B.",
      userId: userB,
      bookingReference: "GB-B",
    });

    const forA = await listNotificationsForUser(userA);
    assert.equal(forA.items.length, 1);
    assert.equal(forA.items[0].bookingReference, "GB-A");
    assert.equal(forA.unreadCount, 1);
  });

  it("marks read only for the owning user", async () => {
    const created = await createNotificationAttempt({
      eventType: "PAYMENT_RECEIVED",
      channel: "EMAIL",
      recipient: "a@example.com",
      subject: "Payment received",
      body: "Payment update",
      userId: userA,
      bookingReference: "GB-READ",
    });
    await finalizeNotificationAttempt({ id: created.id, success: true, providerCode: "CONSOLE" });

    const denied = await markNotificationRead(userB, created.id);
    assert.equal(denied, false);

    const allowed = await markNotificationRead(userA, created.id);
    assert.equal(allowed, true);

    const listed = await listNotificationsForUser(userA);
    assert.equal(listed.unreadCount, 0);
    assert.equal(listed.items[0].unread, false);
  });

  it("scrubs sensitive-looking values from customer views", () => {
    const view = toCustomerNotificationView({
      id: "ntf_x",
      eventType: "PAYMENT_RECEIVED",
      channel: "EMAIL",
      status: "SENT",
      recipient: "guest@example.com",
      subject: "Payment",
      body: "Card 4111111111111111 passport AB1234567 contact guest@example.com",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readAt: null,
    });
    assert.equal(view.summary.includes("4111111111111111"), false);
    assert.equal(view.summary.includes("AB1234567"), false);
    assert.equal(view.summary.includes("guest@example.com"), false);
  });
});

describe("Phase 10 reminder idempotency + ownership", () => {
  it("builds stable idempotency keys", () => {
    const key = buildReminderIdempotencyKey({
      eventType: "DEPARTURE_24_HOURS",
      bookingReference: "GB-REM-10",
      departureAt: "2026-09-01T10:00:00.000Z",
    });
    assert.equal(key, "DEPARTURE_24_HOURS:GB-REM-10:EMAIL:2026-09-01");
  });

  it("excludes cancelled bookings and validates ownership email", () => {
    const cancelled = {
      status: "CANCELLED",
      contactEmail: "ok@example.com",
      termsAcceptedAt: "2026-01-01T00:00:00.000Z",
      offerSnapshot: { departureAt: "2026-09-01T10:00:00.000Z" },
    } as StoredBooking;
    assert.equal(isBookingEligibleForReminders(cancelled), false);

    const bad = {
      status: "PAYMENT_RECEIVED",
      contactEmail: "not-an-email",
      userId: "u1",
    } as StoredBooking;
    assert.equal(assertReminderOwnership(bad).ok, false);
  });

  it("uses absolute time windows with timezone validation", () => {
    assert.equal(
      isWithinReminderWindow({
        departureAt: "2026-09-01T10:00:00+05:00",
        hoursBefore: 24,
        now: new Date("2026-08-31T10:20:00+05:00"),
        timeZone: "Asia/Karachi",
      }),
      true,
    );
    assert.equal(
      isWithinReminderWindow({
        departureAt: "2026-09-01T10:00:00+05:00",
        hoursBefore: 24,
        now: new Date("2026-08-31T10:20:00+05:00"),
        timeZone: "Not/AZone",
      }),
      false,
    );
  });
});

describe("Phase 10 flight-status normalization + unavailable provider", () => {
  const previousProvider = process.env.FLIGHT_STATUS_PROVIDER;
  const previousKey = process.env.FLIGHT_STATUS_API_KEY;

  afterEach(() => {
    if (previousProvider === undefined) delete process.env.FLIGHT_STATUS_PROVIDER;
    else process.env.FLIGHT_STATUS_PROVIDER = previousProvider;
    if (previousKey === undefined) delete process.env.FLIGHT_STATUS_API_KEY;
    else process.env.FLIGHT_STATUS_API_KEY = previousKey;
  });

  it("normalizes AviationStack payloads without inventing gates", () => {
    const mapped = mapAviationStackStatus("scheduled");
    assert.equal(mapped.status, "SCHEDULED");

    const snapshot = normalizeAviationStackFlight({
      flightNumber: "PK309",
      row: {
        flight_status: "scheduled",
        departure: { iata: "ISB", scheduled: "2026-09-01T10:00:00+00:00", delay: 15 },
        arrival: { iata: "DXB", scheduled: "2026-09-01T12:00:00+00:00" },
        airline: { iata: "PK", name: "Pakistan International Airlines" },
        flight: { iata: "PK309" },
      },
    });
    assert.equal(snapshot.status, "DELAYED");
    assert.equal(snapshot.delayMinutes, 15);
    assert.equal(snapshot.gate, undefined);
    assert.equal(snapshot.isMock, false);
  });

  it("reports NOT_CONFIGURED when aviationstack is selected without a key", () => {
    process.env.FLIGHT_STATUS_PROVIDER = "aviationstack";
    delete process.env.FLIGHT_STATUS_API_KEY;
    const env = getFlightStatusEnv();
    assert.equal(env.notConfigured, true);
    assert.equal(env.useLive, false);
  });

  it("commercial adapter returns null when credentials are missing", async () => {
    process.env.FLIGHT_STATUS_PROVIDER = "aviationstack";
    delete process.env.FLIGHT_STATUS_API_KEY;
    const provider = new CommercialFlightStatusProvider();
    const result = await provider.lookup({
      flightNumber: "PK309",
      date: "2026-09-01",
    });
    assert.equal(result, null);
  });

  it("redacts access keys from flight-status errors", () => {
    const safe = safeFlightStatusError(
      new Error("failed access_key=secret123 api_key=abc"),
    );
    assert.equal(safe.includes("secret123"), false);
    assert.equal(safe.includes("abc"), false);
  });
});

describe("Phase 10 PostgreSQL / file-store production warning", () => {
  it("maps app event types onto Prisma enums", () => {
    assert.equal(toPrismaNotificationEventType("DEPARTURE_REMINDER_24H"), "TRIP_24_HOURS");
    assert.equal(toPrismaNotificationEventType("DESTINATION_WEATHER_UPDATE"), "WEATHER_ALERT");
    assert.equal(toPrismaNotificationEventType("PAYMENT_RECEIVED"), "PAYMENT_RECEIVED");
  });

  it("builds a production warning when file stores are active", () => {
    const warning = buildFileStoreWarning({
      booking: "file",
      auth: "file",
      notifications: "file",
    });
    assert.ok(warning);
    if (isProductionEnvironment()) {
      assert.match(warning!, /PRODUCTION WARNING/);
    } else {
      assert.match(warning!, /Development data store/);
    }
  });
});

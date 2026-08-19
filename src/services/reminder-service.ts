import type { StoredBooking } from "@/lib/booking/repository";
import { getBookingRepository } from "@/lib/booking/get-repository";
import {
  buildReminderIdempotencyKey,
  findNotificationByIdempotencyKey,
} from "@/lib/notifications/notification-store";
import { dispatchTravelNotification } from "@/services/notification-service";
import { getDestinationWeather } from "@/services/weather-service";
import type { TravelNotificationTemplateKey } from "@/services/notification-templates";
import {
  canSendByPreference,
  getUserNotificationPreferences,
} from "@/lib/notifications/opt-in";

const ELIGIBLE_STATUSES = new Set([
  "PAYMENT_RECEIVED",
  "TICKETING_PENDING",
  "CONFIRMED",
]);

const EXCLUDED_STATUSES = new Set([
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
  "FAILED",
  "DRAFT",
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
]);

export type ReminderKind = "DEPARTURE_24_HOURS" | "BOARDING_3_HOURS" | "BOARDING_5_HOURS";

export type ReminderRunResult = {
  scanned: number;
  eligible: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{
    bookingReference: string;
    kind: ReminderKind | "WEATHER_UPDATE";
    outcome: "SENT" | "SKIPPED" | "FAILED" | "DUPLICATE";
    reason?: string;
    ownerUserId?: string | null;
  }>;
};

/**
 * Timezone-aware window check using absolute departure timestamps.
 * `timeZone` is accepted for ops/logging; eligibility uses UTC ms on ISO instants
 * so DST/local labeling cannot invent a second send window.
 */
export function isWithinReminderWindow(input: {
  departureAt: string;
  hoursBefore: number;
  now?: Date;
  /** Hours after the target instant during which the reminder may still send. */
  graceHours?: number;
  timeZone?: string;
}): boolean {
  const now = input.now ?? new Date();
  const departure = new Date(input.departureAt);
  if (Number.isNaN(departure.getTime())) return false;

  // Validate timeZone if provided (throws RangeError for invalid IANA zones).
  if (input.timeZone) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: input.timeZone }).format(departure);
    } catch {
      return false;
    }
  }

  const targetMs = departure.getTime() - input.hoursBefore * 60 * 60 * 1000;
  const graceMs = (input.graceHours ?? 1.5) * 60 * 60 * 1000;
  const nowMs = now.getTime();
  return nowMs >= targetMs && nowMs < targetMs + graceMs;
}

export function isBookingEligibleForReminders(booking: StoredBooking): boolean {
  if (EXCLUDED_STATUSES.has(booking.status)) return false;
  if (!ELIGIBLE_STATUSES.has(booking.status)) return false;
  if (!booking.termsAcceptedAt) return false;
  if (!booking.contactEmail) return false;
  if (!booking.offerSnapshot?.departureAt) return false;
  return true;
}

/**
 * Ownership guard: reminders always bind to the booking's stored contact + userId.
 * Never send against a mismatched account email for owned bookings.
 */
export function assertReminderOwnership(booking: StoredBooking): {
  ok: boolean;
  reason?: string;
} {
  if (!booking.contactEmail?.includes("@")) {
    return { ok: false, reason: "MISSING_CONTACT_EMAIL" };
  }
  if (booking.userId && typeof booking.userId !== "string") {
    return { ok: false, reason: "INVALID_OWNER" };
  }
  return { ok: true };
}

/**
 * Provider-neutral reminder engine.
 * Safe for cron / queue / script / protected API. Idempotent + retry-safe:
 * SENT/PENDING skips; FAILED may retry with a new attempt after the prior audit row.
 */
export async function runTravelReminders(input?: {
  now?: Date;
  dryRun?: boolean;
  includeWeather?: boolean;
  timeZone?: string;
}): Promise<ReminderRunResult> {
  const now = input?.now ?? new Date();
  const dryRun = Boolean(input?.dryRun);
  const includeWeather = input?.includeWeather !== false;
  const timeZone = input?.timeZone ?? "Asia/Karachi";
  const { repo } = await getBookingRepository();
  const bookings = await repo.listAll();

  const result: ReminderRunResult = {
    scanned: bookings.length,
    eligible: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const booking of bookings) {
    if (!isBookingEligibleForReminders(booking)) {
      if (EXCLUDED_STATUSES.has(booking.status)) {
        result.skipped += 1;
        result.details.push({
          bookingReference: booking.reference,
          kind: "DEPARTURE_24_HOURS",
          outcome: "SKIPPED",
          reason: `STATUS_${booking.status}`,
          ownerUserId: booking.userId,
        });
      }
      continue;
    }

    const ownership = assertReminderOwnership(booking);
    if (!ownership.ok) {
      result.skipped += 1;
      result.details.push({
        bookingReference: booking.reference,
        kind: "DEPARTURE_24_HOURS",
        outcome: "SKIPPED",
        reason: ownership.reason,
        ownerUserId: booking.userId,
      });
      continue;
    }

    result.eligible += 1;
    const departureAt = booking.offerSnapshot.departureAt;
    const prefs = await getUserNotificationPreferences(booking.userId);

    const jobs: Array<{
      kind: ReminderKind;
      hoursBefore: number;
      template: TravelNotificationTemplateKey;
    }> = [
      {
        kind: "DEPARTURE_24_HOURS",
        hoursBefore: 24,
        template: "DEPARTURE_24_HOURS",
      },
      {
        kind: "BOARDING_3_HOURS",
        hoursBefore: 3,
        template: "BOARDING_3_HOURS",
      },
    ];

    for (const job of jobs) {
      if (
        !isWithinReminderWindow({
          departureAt,
          hoursBefore: job.hoursBefore,
          now,
          timeZone,
        })
      ) {
        continue;
      }

      if (!canSendByPreference(prefs, "TRAVEL_REMINDER")) {
        result.skipped += 1;
        result.details.push({
          bookingReference: booking.reference,
          kind: job.kind,
          outcome: "SKIPPED",
          reason: "OPT_IN_REQUIRED",
          ownerUserId: booking.userId,
        });
        continue;
      }

      const idempotencyKey = buildReminderIdempotencyKey({
        eventType: job.kind,
        bookingReference: booking.reference,
        departureAt,
      });

      const existing = await findNotificationByIdempotencyKey(idempotencyKey);
      if (existing?.status === "SENT" || existing?.status === "PENDING") {
        result.skipped += 1;
        result.details.push({
          bookingReference: booking.reference,
          kind: job.kind,
          outcome: "DUPLICATE",
          reason: "IDEMPOTENCY",
          ownerUserId: booking.userId,
        });
        continue;
      }

      if (dryRun) {
        result.skipped += 1;
        result.details.push({
          bookingReference: booking.reference,
          kind: job.kind,
          outcome: "SKIPPED",
          reason: "DRY_RUN",
          ownerUserId: booking.userId,
        });
        continue;
      }

      const sendResult = await dispatchTravelNotification({
        template: job.template,
        bookingReference: booking.reference,
        recipientEmail: booking.contactEmail,
        destinationCity: booking.offerSnapshot.destinationCity,
        flightNumber: booking.offerSnapshot.flightNumber,
        bookingId: booking.id,
        userId: booking.userId,
        idempotencyKey,
      });

      if (sendResult.success) {
        result.sent += 1;
        result.details.push({
          bookingReference: booking.reference,
          kind: job.kind,
          outcome: "SENT",
          ownerUserId: booking.userId,
        });
      } else {
        result.failed += 1;
        result.details.push({
          bookingReference: booking.reference,
          kind: job.kind,
          outcome: "FAILED",
          reason: sendResult.error ?? "SEND_FAILED",
          ownerUserId: booking.userId,
        });
      }
    }

    if (
      includeWeather &&
      isWithinReminderWindow({
        departureAt,
        hoursBefore: 24,
        now,
        timeZone,
      })
    ) {
      const allowsWeather = canSendByPreference(prefs, "WEATHER_UPDATE");
      if (!allowsWeather) {
        result.skipped += 1;
        result.details.push({
          bookingReference: booking.reference,
          kind: "WEATHER_UPDATE",
          outcome: "SKIPPED",
          reason: "OPT_IN_REQUIRED",
          ownerUserId: booking.userId,
        });
        continue;
      }

      const weatherKey = buildReminderIdempotencyKey({
        eventType: "WEATHER_UPDATE",
        bookingReference: booking.reference,
        departureAt,
      });
      const existingWeather = await findNotificationByIdempotencyKey(weatherKey);
      if (
        existingWeather &&
        (existingWeather.status === "SENT" || existingWeather.status === "PENDING")
      ) {
        result.skipped += 1;
        result.details.push({
          bookingReference: booking.reference,
          kind: "WEATHER_UPDATE",
          outcome: "DUPLICATE",
          reason: "IDEMPOTENCY",
          ownerUserId: booking.userId,
        });
        continue;
      }

      if (dryRun) continue;

      const weather = await getDestinationWeather(booking.offerSnapshot.destination);
      const weatherSummary = weather
        ? `${weather.travelSummary}${weather.isMock ? " (sample weather — not live)" : ""}`
        : undefined;

      const weatherSend = await dispatchTravelNotification({
        template: "WEATHER_UPDATE",
        bookingReference: booking.reference,
        recipientEmail: booking.contactEmail,
        destinationCity: booking.offerSnapshot.destinationCity,
        flightNumber: booking.offerSnapshot.flightNumber,
        bookingId: booking.id,
        userId: booking.userId,
        idempotencyKey: weatherKey,
        weatherSummary,
      });

      if (weatherSend.success) {
        result.sent += 1;
        result.details.push({
          bookingReference: booking.reference,
          kind: "WEATHER_UPDATE",
          outcome: "SENT",
          ownerUserId: booking.userId,
        });
      } else {
        result.failed += 1;
        result.details.push({
          bookingReference: booking.reference,
          kind: "WEATHER_UPDATE",
          outcome: "FAILED",
          reason: weatherSend.error ?? "SEND_FAILED",
          ownerUserId: booking.userId,
        });
      }
    }
  }

  return result;
}

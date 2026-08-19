import { getNotificationProvider } from "@/providers/registry";
import type {
  NotificationPayload,
  NotificationSendResult,
  TravelReminderPlan,
} from "@/types/notification";
import {
  createTravelNotification,
  type TravelNotificationTemplateKey,
} from "@/services/notification-templates";
import {
  createNotificationAttempt,
  finalizeNotificationAttempt,
  findNotificationByIdempotencyKey,
} from "@/lib/notifications/notification-store";
import { getNotificationEnv } from "@/config/notifications";
import {
  canSendByPreference,
  getUserNotificationPreferences,
} from "@/lib/notifications/opt-in";

export async function sendNotification(
  payload: NotificationPayload,
): Promise<NotificationSendResult> {
  const provider = getNotificationProvider();
  const safePayload: NotificationPayload = {
    ...payload,
    metadata: sanitizeNotificationMetadata(payload.metadata),
  };

  const idempotencyKey =
    typeof safePayload.metadata?.idempotencyKey === "string"
      ? safePayload.metadata.idempotencyKey
      : undefined;

  if (idempotencyKey) {
    const existing = await findNotificationByIdempotencyKey(idempotencyKey);
    if (existing?.status === "SENT") {
      return {
        success: true,
        channel: safePayload.channel,
        providerCode: existing.providerCode ?? provider.code,
        messageId: `deduped:${existing.id}`,
        isStub: provider.isStub,
      };
    }
  }

  const attempt = await createNotificationAttempt({
    eventType: safePayload.eventType,
    channel: safePayload.channel,
    recipient: safePayload.recipient,
    subject: safePayload.subject,
    body: safePayload.body,
    htmlBody: safePayload.htmlBody,
    metadata: safePayload.metadata,
    idempotencyKey,
    bookingReference:
      typeof safePayload.metadata?.bookingReference === "string"
        ? safePayload.metadata.bookingReference
        : undefined,
    bookingId:
      typeof safePayload.metadata?.bookingId === "string"
        ? safePayload.metadata.bookingId
        : undefined,
    userId:
      typeof safePayload.metadata?.userId === "string"
        ? safePayload.metadata.userId
        : undefined,
    providerCode: provider.code,
  });

  const result = await provider.send(safePayload);

  await finalizeNotificationAttempt({
    id: attempt.id,
    success: result.success,
    providerCode: result.providerCode,
    failureReason: result.success ? undefined : sanitizeFailure(result.error),
    messageId: result.messageId,
  });

  return result;
}

function preferenceKindForTemplate(
  template: TravelNotificationTemplateKey,
): "TRANSACTIONAL" | "TRAVEL_REMINDER" | "WEATHER_UPDATE" | "FLIGHT_STATUS" {
  if (
    template === "PAYMENT_RECEIVED" ||
    template === "TICKETING_PENDING" ||
    template === "BOOKING_CONFIRMED" ||
    template === "BOOKING_CANCELLED" ||
    template === "BOOKING_CHANGED"
  ) {
    return "TRANSACTIONAL";
  }
  if (template === "WEATHER_UPDATE") return "WEATHER_UPDATE";
  if (template === "FLIGHT_STATUS_CHANGE") return "FLIGHT_STATUS";
  return "TRAVEL_REMINDER";
}

/**
 * Dispatch travel templates via configured email provider (console by default).
 */
export async function dispatchTravelNotification(input: {
  template: TravelNotificationTemplateKey;
  bookingReference: string;
  recipientEmail: string;
  destinationCity?: string;
  flightNumber?: string;
  weatherSummary?: string;
  bookingId?: string;
  userId?: string | null;
  idempotencyKey?: string;
  requireOptionalOptIn?: boolean;
}): Promise<NotificationSendResult> {
  const prefs = await getUserNotificationPreferences(input.userId);
  const kind = preferenceKindForTemplate(input.template);
  if (!canSendByPreference(prefs, kind)) {
    return {
      success: false,
      channel: "EMAIL",
      providerCode: getNotificationProvider().code,
      error: "OPT_IN_REQUIRED",
      isStub: true,
    };
  }

  const payload = createTravelNotification(input);
  payload.metadata = {
    ...payload.metadata,
    bookingId: input.bookingId ?? null,
    userId: input.userId ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
  };

  return sendNotification(payload);
}

export function buildTravelReminderPlan(input: {
  bookingReference: string;
  departureAt: string;
}): TravelReminderPlan {
  const departure = new Date(input.departureAt);
  const ms = departure.getTime();

  const atOffset = (hoursBefore: number) =>
    new Date(ms - hoursBefore * 60 * 60 * 1000).toISOString();

  const env = getNotificationEnv();
  const deliveryNote = env.useLive
    ? "email delivery when Reminder engine runs"
    : "console/dev delivery until EMAIL_PROVIDER=resend is configured";

  return {
    bookingReference: input.bookingReference,
    departureAt: input.departureAt,
    reminders: [
      {
        eventType: "DEPARTURE_REMINDER_24H",
        scheduledFor: atOffset(24),
        description: `Departure reminder — 24 hours before (${deliveryNote})`,
      },
      {
        eventType: "BOARDING_REMINDER",
        scheduledFor: atOffset(3),
        description: `Travel reminder — 3 hours before departure (${deliveryNote})`,
      },
      {
        eventType: "DESTINATION_WEATHER_UPDATE",
        scheduledFor: atOffset(24),
        description: `Destination weather update (${deliveryNote}; opt-in required for live weather emails)`,
      },
    ],
  };
}

function sanitizeNotificationMetadata(
  metadata?: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> | undefined {
  if (!metadata) return undefined;
  const blocked = /passport|card|cvv|secret|password|token|pan|apikey|authorization/i;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (blocked.test(key)) continue;
    if (typeof value === "string" && blocked.test(value)) continue;
    out[key] = value;
  }
  return out;
}

function sanitizeFailure(error?: string): string | undefined {
  if (!error) return undefined;
  return error
    .replace(/re_[A-Za-z0-9]+/g, "[REDACTED]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .slice(0, 160);
}

export { sanitizeNotificationMetadata };

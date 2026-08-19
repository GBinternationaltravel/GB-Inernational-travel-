import { prisma } from "@/lib/db";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { NotificationChannel, NotificationEventType } from "@/types/notification";
import { warnIfFileStoreInProduction } from "@/lib/data-store";

export type StoredNotificationRecord = {
  id: string;
  eventType: string;
  channel: string;
  status: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
  recipient: string;
  subject?: string | null;
  body: string;
  htmlBody?: string | null;
  metadata?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
  providerCode?: string | null;
  failureReason?: string | null;
  bookingReference?: string | null;
  bookingId?: string | null;
  userId?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  retryCount?: number;
  lastRetryAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

const FILE_PATH = path.join(process.cwd(), ".data", "notifications.json");

let prismaAvailable: boolean | null = null;

async function canUsePrismaNotifications(): Promise<boolean> {
  if (process.env.NOTIFICATION_STORE === "file") return false;
  if (process.env.NOTIFICATION_STORE === "prisma") return true;
  if (prismaAvailable !== null) return prismaAvailable;
  try {
    await prisma.$queryRaw`SELECT 1`;
    prismaAvailable = true;
  } catch {
    prismaAvailable = false;
  }
  return prismaAvailable;
}

async function ensureFile(): Promise<StoredNotificationRecord[]> {
  warnIfFileStoreInProduction("notifications");
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as StoredNotificationRecord[];
  } catch {
    await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
    await fs.writeFile(FILE_PATH, "[]", "utf8");
    return [];
  }
}

async function writeFile(rows: StoredNotificationRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(rows, null, 2), "utf8");
}

function maskRecipient(recipient: string): string {
  if (recipient.includes("@")) {
    const [local, domain] = recipient.split("@");
    if (!local || !domain) return "***";
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return `***${recipient.slice(-4)}`;
}

/** Safe customer-facing notification (no PII, no payment/passport details). */
export function toCustomerNotificationView(row: StoredNotificationRecord) {
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    eventType: row.eventType,
    channel: row.channel,
    status: row.status,
    subject: row.subject ?? "Notification",
    summary: safeSummary(row),
    bookingReference: row.bookingReference ?? null,
    createdAt: row.createdAt,
    sentAt: row.sentAt ?? null,
    readAt: row.readAt ?? null,
    unread: !row.readAt,
    category: categoryForEvent(row.eventType),
    hint:
      typeof meta.customerHint === "string"
        ? meta.customerHint
        : undefined,
  };
}

function safeSummary(row: StoredNotificationRecord): string {
  const text = (row.body || row.subject || "").replace(/\s+/g, " ").trim();
  if (!text) return "Account update";
  // Strip emails / long digits that look like cards/passports
  const scrubbed = text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b\d{12,19}\b/g, "[redacted]")
    .replace(/\b[A-Z]{1,2}\d{6,9}\b/g, "[redacted]");
  return scrubbed.length > 180 ? `${scrubbed.slice(0, 177)}…` : scrubbed;
}

function categoryForEvent(eventType: string): string {
  if (eventType.includes("PAYMENT")) return "payment";
  if (eventType.includes("TICKET")) return "ticketing";
  if (eventType.includes("BOOKING") || eventType.includes("HOLD")) return "booking";
  if (eventType.includes("WEATHER")) return "weather";
  if (eventType.includes("FLIGHT_STATUS")) return "flight-status";
  if (eventType.includes("REMINDER")) return "reminder";
  return "general";
}

export function toAdminNotificationView(row: StoredNotificationRecord) {
  return {
    id: row.id,
    eventType: row.eventType,
    channel: row.channel,
    status: row.status,
    recipientMasked: maskRecipient(row.recipient),
    subject: row.subject ?? null,
    providerCode: row.providerCode ?? null,
    failureReason: row.failureReason ?? null,
    bookingReference: row.bookingReference ?? null,
    createdAt: row.createdAt,
    sentAt: row.sentAt ?? null,
    retryCount: row.retryCount ?? 0,
    lastRetryAt: row.lastRetryAt ?? null,
    retryState:
      row.status === "FAILED"
        ? (row.retryCount ?? 0) > 0
          ? "retried"
          : "failed"
        : row.status === "PENDING"
          ? "pending"
          : "n/a",
  };
}

export async function findNotificationByIdempotencyKey(
  idempotencyKey: string,
): Promise<StoredNotificationRecord | null> {
  if (await canUsePrismaNotifications()) {
    try {
      const row = await prisma.notification.findUnique({
        where: { idempotencyKey },
      });
      if (row) return mapPrisma(row);
    } catch {
      prismaAvailable = false;
    }
  }

  const rows = await ensureFile();
  return rows.find((r) => r.idempotencyKey === idempotencyKey) ?? null;
}

/** Maps app event labels onto Prisma NotificationEventType enum values. */
export function toPrismaNotificationEventType(
  eventType: string,
): NotificationEventType | string {
  const map: Record<string, string> = {
    DEPARTURE_REMINDER_24H: "TRIP_24_HOURS",
    BOARDING_REMINDER_5H: "BOARDING_REMINDER",
    DESTINATION_WEATHER_UPDATE: "WEATHER_ALERT",
    TICKETING_STATUS: "TICKETING_PENDING",
    DEPARTURE_24_HOURS: "TRIP_24_HOURS",
    BOARDING_5_HOURS: "BOARDING_REMINDER",
    BOARDING_3_HOURS: "BOARDING_REMINDER",
    BOARDING_REMINDER: "BOARDING_REMINDER",
    WEATHER_UPDATE: "WEATHER_ALERT",
  };
  return map[eventType] ?? eventType;
}

export function buildReminderIdempotencyKey(input: {
  eventType: string;
  bookingReference: string;
  departureAt: string;
}): string {
  const day = input.departureAt.slice(0, 10);
  return `${input.eventType}:${input.bookingReference}:EMAIL:${day}`;
}

export async function finalizeNotificationAttempt(input: {
  id: string;
  success: boolean;
  providerCode?: string;
  failureReason?: string;
  messageId?: string;
}): Promise<void> {
  if (input.success) {
    await markNotificationSent(input.id, input.providerCode);
    return;
  }
  await markNotificationFailed(
    input.id,
    input.failureReason ?? "SEND_FAILED",
    input.providerCode,
  );
}

export async function createNotificationAttempt(input: {
  eventType: NotificationEventType | string;
  channel: NotificationChannel | string;
  recipient: string;
  subject?: string;
  body: string;
  htmlBody?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  bookingReference?: string;
  bookingId?: string;
  userId?: string;
  providerCode?: string;
}): Promise<StoredNotificationRecord> {
  const now = new Date().toISOString();
  const id = `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const prismaEventType = toPrismaNotificationEventType(String(input.eventType));
  const metadata = {
    ...(input.metadata ?? {}),
    appEventType: input.eventType,
  };

  if (await canUsePrismaNotifications()) {
    try {
      const row = await prisma.notification.create({
        data: {
          id,
          eventType: prismaEventType as never,
          channel: input.channel as never,
          status: "PENDING",
          recipient: input.recipient,
          subject: input.subject,
          body: input.body,
          htmlBody: input.htmlBody,
          metadata: metadata as never,
          idempotencyKey: input.idempotencyKey,
          bookingReference: input.bookingReference,
          bookingId: input.bookingId,
          userId: input.userId,
          providerCode: input.providerCode,
          retryCount: 0,
        },
      });
      return mapPrisma(row);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      // Unknown / missing user should not drop the notification — retry without FK.
      if (code === "P2003" && input.userId) {
        try {
          const row = await prisma.notification.create({
            data: {
              id,
              eventType: prismaEventType as never,
              channel: input.channel as never,
              status: "PENDING",
              recipient: input.recipient,
              subject: input.subject,
              body: input.body,
              htmlBody: input.htmlBody,
              metadata: {
                ...metadata,
                orphanedUserId: input.userId,
              } as never,
              idempotencyKey: input.idempotencyKey,
              bookingReference: input.bookingReference,
              bookingId: input.bookingId,
              userId: null,
              providerCode: input.providerCode,
              retryCount: 0,
            },
          });
          return mapPrisma(row);
        } catch {
          // fall through to file
        }
      } else if (code !== "P2003" && code !== "P2002") {
        // Connection / unexpected DB errors — allow file fallback for this process.
        try {
          await prisma.$queryRaw`SELECT 1`;
        } catch {
          prismaAvailable = false;
        }
      }
    }
  }

  const record: StoredNotificationRecord = {
    id,
    eventType: input.eventType,
    channel: input.channel,
    status: "PENDING",
    recipient: input.recipient,
    subject: input.subject ?? null,
    body: input.body,
    htmlBody: input.htmlBody ?? null,
    metadata: metadata ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    bookingReference: input.bookingReference ?? null,
    bookingId: input.bookingId ?? null,
    userId: input.userId ?? null,
    providerCode: input.providerCode ?? null,
    failureReason: null,
    sentAt: null,
    readAt: null,
    retryCount: 0,
    lastRetryAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const rows = await ensureFile();
  rows.unshift(record);
  await writeFile(rows.slice(0, 500));
  return record;
}

export async function markNotificationSent(
  id: string,
  providerCode?: string,
): Promise<void> {
  const now = new Date().toISOString();
  if (await canUsePrismaNotifications()) {
    try {
      await prisma.notification.update({
        where: { id },
        data: {
          status: "SENT",
          sentAt: new Date(now),
          providerCode: providerCode ?? undefined,
          failureReason: null,
        },
      });
      return;
    } catch {
      prismaAvailable = false;
    }
  }

  const rows = await ensureFile();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const current = rows[idx];
  if (!current) return;
  rows[idx] = {
    ...current,
    status: "SENT",
    sentAt: now,
    providerCode: providerCode ?? current.providerCode,
    failureReason: null,
    updatedAt: now,
  };
  await writeFile(rows);
}

export async function markNotificationFailed(
  id: string,
  reason: string,
  providerCode?: string,
): Promise<void> {
  const now = new Date().toISOString();
  if (await canUsePrismaNotifications()) {
    try {
      const existing = await prisma.notification.findUnique({ where: { id } });
      await prisma.notification.update({
        where: { id },
        data: {
          status: "FAILED",
          failureReason: reason.slice(0, 500),
          providerCode: providerCode ?? undefined,
          retryCount: (existing?.retryCount ?? 0) + 1,
          lastRetryAt: new Date(now),
        },
      });
      return;
    } catch {
      prismaAvailable = false;
    }
  }

  const rows = await ensureFile();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const current = rows[idx];
  if (!current) return;
  rows[idx] = {
    ...current,
    status: "FAILED",
    failureReason: reason.slice(0, 500),
    providerCode: providerCode ?? current.providerCode,
    retryCount: (current.retryCount ?? 0) + 1,
    lastRetryAt: now,
    updatedAt: now,
  };
  await writeFile(rows);
}

export async function listNotificationsForAdmin(limit = 100): Promise<
  ReturnType<typeof toAdminNotificationView>[]
> {
  if (await canUsePrismaNotifications()) {
    try {
      const rows = await prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map((r) => toAdminNotificationView(mapPrisma(r)));
    } catch {
      prismaAvailable = false;
    }
  }

  const rows = await ensureFile();
  return rows.slice(0, limit).map(toAdminNotificationView);
}

export async function listNotificationsForUser(
  userId: string,
  options?: { limit?: number; offset?: number; unreadOnly?: boolean },
): Promise<{
  items: ReturnType<typeof toCustomerNotificationView>[];
  total: number;
  unreadCount: number;
}> {
  const limit = options?.limit ?? 30;
  const offset = options?.offset ?? 0;

  if (await canUsePrismaNotifications()) {
    try {
      const where = {
        userId,
        ...(options?.unreadOnly ? { readAt: null } : {}),
      };
      const [rows, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId, readAt: null } }),
      ]);
      return {
        items: rows.map((r) => toCustomerNotificationView(mapPrisma(r))),
        total,
        unreadCount,
      };
    } catch {
      prismaAvailable = false;
    }
  }

  const rows = await ensureFile();
  const mine = rows.filter((r) => r.userId === userId);
  const unreadCount = mine.filter((r) => !r.readAt).length;
  const filtered = options?.unreadOnly ? mine.filter((r) => !r.readAt) : mine;
  return {
    items: filtered.slice(offset, offset + limit).map(toCustomerNotificationView),
    total: filtered.length,
    unreadCount,
  };
}

export async function listNotificationsForBooking(
  userId: string,
  bookingReference: string,
  limit = 20,
): Promise<ReturnType<typeof toCustomerNotificationView>[]> {
  if (await canUsePrismaNotifications()) {
    try {
      const rows = await prisma.notification.findMany({
        where: { userId, bookingReference },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map((r) => toCustomerNotificationView(mapPrisma(r)));
    } catch {
      prismaAvailable = false;
    }
  }

  const rows = await ensureFile();
  return rows
    .filter((r) => r.userId === userId && r.bookingReference === bookingReference)
    .slice(0, limit)
    .map(toCustomerNotificationView);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  if (await canUsePrismaNotifications()) {
    try {
      const row = await prisma.notification.findFirst({
        where: { id: notificationId, userId },
      });
      if (!row) return false;
      if (!row.readAt) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { readAt: new Date(now) },
        });
      }
      return true;
    } catch {
      prismaAvailable = false;
    }
  }

  const rows = await ensureFile();
  const idx = rows.findIndex((r) => r.id === notificationId && r.userId === userId);
  if (idx < 0) return false;
  const current = rows[idx];
  if (!current) return false;
  if (!current.readAt) {
    rows[idx] = { ...current, readAt: now, updatedAt: now };
    await writeFile(rows);
  }
  return true;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const now = new Date().toISOString();
  if (await canUsePrismaNotifications()) {
    try {
      const result = await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date(now) },
      });
      return result.count;
    } catch {
      prismaAvailable = false;
    }
  }

  const rows = await ensureFile();
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.userId === userId && !row.readAt) {
      rows[i] = { ...row, readAt: now, updatedAt: now };
      count += 1;
    }
  }
  if (count > 0) await writeFile(rows);
  return count;
}

function mapPrisma(row: {
  id: string;
  eventType: string;
  channel: string;
  status: string;
  recipient: string;
  subject: string | null;
  body: string;
  htmlBody: string | null;
  metadata: unknown;
  idempotencyKey: string | null;
  providerCode: string | null;
  failureReason: string | null;
  bookingReference: string | null;
  bookingId: string | null;
  userId: string | null;
  sentAt: Date | null;
  readAt?: Date | null;
  retryCount?: number | null;
  lastRetryAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): StoredNotificationRecord {
  return {
    id: row.id,
    eventType: row.eventType,
    channel: row.channel,
    status: row.status as StoredNotificationRecord["status"],
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    htmlBody: row.htmlBody,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    idempotencyKey: row.idempotencyKey,
    providerCode: row.providerCode,
    failureReason: row.failureReason,
    bookingReference: row.bookingReference,
    bookingId: row.bookingId,
    userId: row.userId,
    sentAt: row.sentAt?.toISOString() ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    retryCount: row.retryCount ?? 0,
    lastRetryAt: row.lastRetryAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

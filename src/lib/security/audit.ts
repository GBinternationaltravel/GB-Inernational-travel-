/**
 * Audit logging — Prisma when available, file fallback for local development.
 * Never store passwords, passport numbers, card data, or secrets in metadata.
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { redactForLogs } from "@/lib/booking/masking";

export type AuditLogInput = {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export type StoredAuditLog = {
  id: string;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "audit-logs.json");

async function readFileLogs(): Promise<StoredAuditLog[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as StoredAuditLog[];
  } catch {
    return [];
  }
}

async function appendFileLog(entry: StoredAuditLog): Promise<void> {
  const logs = await readFileLogs();
  logs.unshift(entry);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(logs.slice(0, 2000), null, 2), "utf8");
}

function sanitizeMetadata(
  metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  return redactForLogs({
    ...metadata,
    password: undefined,
    passwordHash: undefined,
    passportNumber: undefined,
    cardNumber: undefined,
    cvv: undefined,
    secret: undefined,
    apiKey: undefined,
  });
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  const metadata = sanitizeMetadata(input.metadata);
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
    return;
  } catch {
    // Staging/production (incl. Vercel) must not write to ephemeral/read-only filesystem.
    const { requiresPrismaStores } = await import("@/lib/data-store");
    if (requiresPrismaStores()) {
      console.error("[audit] Prisma write failed; file fallback disabled on staging/production.");
      return;
    }
    const entry: StoredAuditLog = {
      id: randomUUID(),
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: metadata ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: new Date().toISOString(),
    };
    try {
      await appendFileLog(entry);
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.info("[audit]", input.action, input.entityType ?? "", input.entityId ?? "");
      }
    }
  }
}

export async function listAuditLogs(limit = 50): Promise<StoredAuditLog[]> {
  try {
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch {
    const logs = await readFileLogs();
    return logs.slice(0, limit);
  }
}

export class AuditLogService {
  write = writeAuditLog;
  list = listAuditLogs;
}

export const auditLogService = new AuditLogService();

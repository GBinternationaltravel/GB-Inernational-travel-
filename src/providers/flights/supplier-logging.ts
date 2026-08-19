import { redactForLogs } from "@/lib/booking/masking";
import { SupplierError } from "@/providers/flights/supplier-errors";
import { randomUUID } from "crypto";

export type SupplierLogEntry = {
  supplierCode: string;
  operation: string;
  success: boolean;
  durationMs: number;
  correlationId: string;
  errorCode?: string;
  httpStatus?: number;
  metadata?: Record<string, unknown>;
  at: string;
};

const recentLogs: SupplierLogEntry[] = [];
const MAX_LOGS = 100;

let lastSuccessAt: string | null = null;
let lastError: string | null = null;

export function getSupplierLogState() {
  return {
    lastSuccessfulRequestAt: lastSuccessAt,
    lastError,
    recent: [...recentLogs],
  };
}

export async function withSupplierLogging<T>(
  supplierCode: string,
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const started = Date.now();
  const correlationId = randomUUID();
  const safeMeta = metadata
    ? redactForLogs({ ...metadata, correlationId })
    : { correlationId };
  try {
    const result = await fn();
    lastSuccessAt = new Date().toISOString();
    pushLog({
      supplierCode,
      operation,
      success: true,
      durationMs: Date.now() - started,
      correlationId,
      metadata: safeMeta,
      at: lastSuccessAt,
    });
    return result;
  } catch (error) {
    const errorCode =
      error instanceof SupplierError
        ? error.code
        : error instanceof Error
          ? error.name
          : "Error";
    lastError =
      error instanceof SupplierError
        ? error.code
        : error instanceof Error
          ? error.message
          : "Unknown supplier error";
    pushLog({
      supplierCode,
      operation,
      success: false,
      durationMs: Date.now() - started,
      correlationId,
      errorCode,
      httpStatus:
        error instanceof SupplierError && typeof error.details?.httpStatus === "number"
          ? Number(error.details.httpStatus)
          : undefined,
      metadata: safeMeta,
      at: new Date().toISOString(),
    });
    throw error;
  }
}

function pushLog(entry: SupplierLogEntry) {
  recentLogs.unshift(entry);
  if (recentLogs.length > MAX_LOGS) recentLogs.length = MAX_LOGS;
  if (process.env.NODE_ENV === "development") {
    console.info(
      "[supplier]",
      entry.correlationId,
      entry.supplierCode,
      entry.operation,
      entry.success ? "ok" : "fail",
      entry.errorCode ?? "",
      `${entry.durationMs}ms`,
    );
  }
}

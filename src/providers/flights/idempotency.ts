/**
 * Idempotency helpers for supplier booking/ticketing.
 * Search may retry; booking/ticketing must not create duplicates.
 */

type CacheEntry = {
  key: string;
  operation: string;
  createdAt: number;
  result: unknown;
};

const store = new Map<string, CacheEntry>();
const TTL_MS = 1000 * 60 * 60;

export function buildIdempotencyKey(parts: string[]): string {
  return parts.filter(Boolean).join(":");
}

export function getIdempotentResult<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.result as T;
}

export function setIdempotentResult(key: string, operation: string, result: unknown): void {
  store.set(key, {
    key,
    operation,
    createdAt: Date.now(),
    result,
  });
}

export async function withIdempotency<T>(
  key: string,
  operation: string,
  execute: () => Promise<T>,
): Promise<{ result: T; replayed: boolean }> {
  const existing = getIdempotentResult<T>(key);
  if (existing) {
    return { result: existing, replayed: true };
  }
  const result = await execute();
  setIdempotentResult(key, operation, result);
  return { result, replayed: false };
}

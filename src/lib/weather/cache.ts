type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Simple in-memory TTL cache for weather responses (process-local).
 */
export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private readonly defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Sliding-window rate limiter for outbound weather API calls.
 */
export class SlidingWindowRateLimiter {
  private hits: number[] = [];

  constructor(
    private readonly maxHits: number,
    private readonly windowMs: number,
  ) {}

  tryAcquire(): boolean {
    const now = Date.now();
    this.hits = this.hits.filter((t) => now - t < this.windowMs);
    if (this.hits.length >= this.maxHits) return false;
    this.hits.push(now);
    return true;
  }

  reset(): void {
    this.hits = [];
  }
}

import { revalidatePath } from "next/cache";

/** Pages that show "Fares last updated" or published inventory. */
export const PUBLISHED_FARE_PATHS = ["/", "/flights", "/flights/domestic", "/flights/international"] as const;

/**
 * Drop the cached public fare pages after a staff fare change.
 * Safe to call from a route handler. Ignored when Next has no request context (local scripts).
 */
export function revalidatePublishedFares(): void {
  for (const path of PUBLISHED_FARE_PATHS) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.error(
        "[revalidate] published fares",
        path,
        error instanceof Error ? error.message : "failed",
      );
    }
  }
}

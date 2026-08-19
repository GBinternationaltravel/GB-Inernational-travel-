/**
 * Shared React hooks will live here as features grow.
 * Example future hooks: useFlightSearch, useDebouncedValue, useMediaQuery.
 */

export function useIsClient() {
  // Placeholder pattern for client-only rendering checks in future components.
  if (typeof window === "undefined") return false;
  return true;
}

/** Log a server failure without phone numbers, emails, or document numbers. */
export function logServerFailure(scope: string, error: unknown): void {
  const message = error instanceof Error ? error.message : "failed";
  const cleaned = message
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s()-]{7,}\d/g, "[phone]");
  console.error(`[${scope}]`, cleaned.slice(0, 300));
}

import { timingSafeEqual } from "node:crypto";
import { getNotificationEnv } from "@/config/notifications";

export type ReminderAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

/**
 * Authorize reminder cron callers.
 * Accepts Bearer token matching REMINDER_CRON_SECRET (app) or CRON_SECRET (Vercel Cron).
 * Never logs the secret value.
 */
export function authorizeReminderCronRequest(
  authorizationHeader: string | null,
): ReminderAuthResult {
  const env = getNotificationEnv();
  const vercelCronSecret = process.env.CRON_SECRET?.trim() || "";
  const expectedSecrets = [env.reminderCronSecret, vercelCronSecret].filter(Boolean);

  if (expectedSecrets.length === 0) {
    return {
      ok: false,
      status: 503,
      error: "REMINDER_CRON_SECRET (or CRON_SECRET) is not configured.",
    };
  }

  const header = authorizationHeader ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !expectedSecrets.some((secret) => secretsMatch(token, secret))) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

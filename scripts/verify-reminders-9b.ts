/**
 * Phase 9B reminder authorization + dry-run verification.
 *
 * Usage:
 *   npx tsx scripts/verify-reminders-9b.ts
 */
import { authorizeReminderCronRequest } from "../src/lib/notifications/reminder-auth";
import { runTravelReminders } from "../src/services/reminder-service";
import { getNotificationEnv } from "../src/config/notifications";

async function main() {
  const env = getNotificationEnv();
  console.info("[verify:reminders]", {
    secretConfigured: Boolean(env.reminderCronSecret),
  });

  const missing = authorizeReminderCronRequest(null);
  console.info("[verify:reminders:auth]", {
    case: "missing_header",
    ok: missing.ok,
    status: missing.ok ? 200 : missing.status,
  });

  const wrong = authorizeReminderCronRequest("Bearer wrong-secret");
  console.info("[verify:reminders:auth]", {
    case: "wrong_secret",
    ok: wrong.ok,
    status: wrong.ok ? 200 : wrong.status,
  });

  if (env.reminderCronSecret) {
    const good = authorizeReminderCronRequest(`Bearer ${env.reminderCronSecret}`);
    console.info("[verify:reminders:auth]", {
      case: "valid_secret",
      ok: good.ok,
    });
  } else {
    console.info("[verify:reminders] REMINDER_CRON_SECRET missing — HTTP auth cannot be fully verified.");
  }

  const dry = await runTravelReminders({ dryRun: true, includeWeather: true });
  console.info("[verify:reminders:dry-run]", {
    scanned: dry.scanned,
    eligible: dry.eligible,
    sent: dry.sent,
    skipped: dry.skipped,
    failed: dry.failed,
  });
}

main().catch((error) => {
  console.error("[verify:reminders] failed", error instanceof Error ? error.message : "unknown");
  process.exitCode = 1;
});

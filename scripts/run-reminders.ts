/**
 * Manual reminder runner for development / cron hooks.
 *
 * Usage:
 *   npx tsx scripts/run-reminders.ts
 *   npx tsx scripts/run-reminders.ts --dry-run
 */
import { runTravelReminders } from "../src/services/reminder-service";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await runTravelReminders({ dryRun });
  console.info("[reminders]", {
    dryRun,
    scanned: result.scanned,
    eligible: result.eligible,
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
  });
}

main().catch((error) => {
  console.error("[reminders] failed", error instanceof Error ? error.message : "unknown");
  process.exitCode = 1;
});

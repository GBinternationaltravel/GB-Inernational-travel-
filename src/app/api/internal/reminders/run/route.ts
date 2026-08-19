import { NextResponse } from "next/server";
import { authorizeReminderCronRequest } from "@/lib/notifications/reminder-auth";
import { runTravelReminders } from "@/services/reminder-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Protected reminder runner.
 * - External schedulers: POST with Authorization: Bearer <REMINDER_CRON_SECRET>
 * - Vercel Cron: GET with Authorization: Bearer <CRON_SECRET> (platform-injected)
 * Optional: ?dryRun=1
 */
async function run(request: Request) {
  const auth = authorizeReminderCronRequest(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const result = await runTravelReminders({ dryRun });
  return NextResponse.json({
    ok: true,
    dryRun,
    result: {
      scanned: result.scanned,
      eligible: result.eligible,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      details: result.details.slice(0, 100),
    },
  });
}

export async function POST(request: Request) {
  return run(request);
}

/** Vercel Cron invokes scheduled paths with GET. */
export async function GET(request: Request) {
  return run(request);
}

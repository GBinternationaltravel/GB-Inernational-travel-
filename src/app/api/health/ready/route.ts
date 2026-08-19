import { NextResponse } from "next/server";
import { getProductionHealthReport } from "@/lib/production-health";

export const dynamic = "force-dynamic";

/**
 * Readiness / cutover probe — safe JSON only (no secrets, no PII).
 * Returns 503 when production stores cannot use PostgreSQL.
 */
export async function GET() {
  try {
    const report = await getProductionHealthReport();
    return NextResponse.json(
      {
        status: report.ok ? "ready" : "not_ready",
        ...report,
      },
      { status: report.ok ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message.slice(0, 160) : "HEALTH_FAILED",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

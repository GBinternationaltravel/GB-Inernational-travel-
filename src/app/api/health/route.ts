import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness probe — process is up. Does not require PostgreSQL.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "gb-international-travel",
    checkedAt: new Date().toISOString(),
  });
}

/** Optional HEAD for uptime monitors. */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

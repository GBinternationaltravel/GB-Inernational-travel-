import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/security/rate-limit";
import { PUBLISHED_FARE_PATHS } from "@/lib/cache/revalidate-public-fares";

export const dynamic = "force-dynamic";

const extraPaths = ["/travel-updates", "/flight-status"] as const;

function allowedPaths(): Set<string> {
  return new Set<string>([...PUBLISHED_FARE_PATHS, ...extraPaths]);
}

/**
 * On-demand revalidation for published fare and content pages.
 * Authorization: Bearer <REVALIDATE_SECRET>
 * Body: { "paths": ["/flights"] } — omitted paths refresh the fare pages.
 */
export async function POST(request: Request) {
  const limited = rateLimit("revalidate", { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ ok: false, message: "Too many requests." }, { status: 429 });
  }

  const secret = process.env.REVALIDATE_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let requested: string[] = [...PUBLISHED_FARE_PATHS];
  try {
    const body = (await request.json()) as { paths?: unknown };
    if (Array.isArray(body.paths) && body.paths.every((path) => typeof path === "string")) {
      requested = body.paths;
    }
  } catch {
    // Empty body refreshes the fare pages.
  }

  const allow = allowedPaths();
  const refreshed: string[] = [];
  for (const path of requested) {
    if (!allow.has(path)) continue;
    revalidatePath(path);
    refreshed.push(path);
  }

  return NextResponse.json({ ok: true, refreshed });
}

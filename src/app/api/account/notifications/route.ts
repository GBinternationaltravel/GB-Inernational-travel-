import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listNotificationsForUser } from "@/lib/notifications/notification-store";

export const dynamic = "force-dynamic";

/**
 * Customer notification center API — scoped to the authenticated user.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);
  const unreadOnly = url.searchParams.get("unread") === "1";

  const result = await listNotificationsForUser(user.id, {
    limit,
    offset,
    unreadOnly,
  });

  return NextResponse.json({
    ok: true,
    unreadCount: result.unreadCount,
    total: result.total,
    items: result.items,
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/notification-store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  id: z.string().min(1).optional(),
  all: z.boolean().optional(),
});

/**
 * Mark notification(s) read for the authenticated account only.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (parsed.data.all) {
    const count = await markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true, marked: count });
  }

  if (!parsed.data.id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  const ok = await markNotificationRead(user.id, parsed.data.id);
  if (!ok) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

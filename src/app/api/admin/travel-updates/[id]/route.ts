import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import { travelUpdatePriorityEnum, travelUpdateUpsertSchema } from "@/lib/validations/cms";
import {
  expireAdminTravelUpdate,
  setAdminTravelUpdatePriority,
  setAdminTravelUpdatePublished,
  upsertAdminTravelUpdate,
} from "@/services/admin-cms-service";

type Params = { params: Promise<{ id: string }> };

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish"), isPublished: z.boolean() }),
  z.object({ action: z.literal("priority"), priority: travelUpdatePriorityEnum }),
  z.object({ action: z.literal("expire") }),
]);

export async function PATCH(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:travel-updates-update:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "cms.manage" });
    const { id } = await params;
    const json = await request.json();
    const parsed = travelUpdateUpsertSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const result = await upsertAdminTravelUpdate({
      actorId: admin.id,
      id,
      data: parsed.data,
    });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not update travel update.");
  }
}

export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:travel-updates-action:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "cms.manage" });
    const { id } = await params;
    const json = await request.json();

    // Backward-compatible publish toggle (matches deals pattern)
    if (typeof json?.isPublished === "boolean" && !json.action) {
      const result = await setAdminTravelUpdatePublished({
        actorId: admin.id,
        id,
        isPublished: json.isPublished,
      });
      return NextResponse.json(result);
    }

    const parsed = actionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    if (parsed.data.action === "publish") {
      const result = await setAdminTravelUpdatePublished({
        actorId: admin.id,
        id,
        isPublished: parsed.data.isPublished,
      });
      return NextResponse.json(result);
    }
    if (parsed.data.action === "priority") {
      const result = await setAdminTravelUpdatePriority({
        actorId: admin.id,
        id,
        priority: parsed.data.priority,
      });
      return NextResponse.json(result);
    }

    const result = await expireAdminTravelUpdate({ actorId: admin.id, id });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not update travel update state.");
  }
}

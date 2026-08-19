import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import { siteSettingsSchema } from "@/lib/validations/cms";
import { getAdminSettings, saveAdminSettings } from "@/services/admin-cms-service";

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:settings-get:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    await requireAdminApi({ permissions: "settings.manage" });
    const result = await getAdminSettings();
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not load settings.");
  }
}

export async function PUT(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:settings-save:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "settings.manage" });
    const json = await request.json();
    const parsed = siteSettingsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const result = await saveAdminSettings({
      actorId: admin.id,
      data: parsed.data,
    });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not save settings.");
  }
}

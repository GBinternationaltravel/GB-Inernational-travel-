import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import { tourPackageUpsertSchema } from "@/lib/validations/cms";
import { upsertAdminTour } from "@/services/admin-cms-service";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:tours-create:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "cms.manage" });
    const json = await request.json();
    const parsed = tourPackageUpsertSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const result = await upsertAdminTour({
      actorId: admin.id,
      data: parsed.data,
    });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not create tour.");
  }
}

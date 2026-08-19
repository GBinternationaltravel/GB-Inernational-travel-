import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import { faqUpsertSchema } from "@/lib/validations/cms";
import { setAdminFaqPublished, upsertAdminFaq } from "@/services/admin-cms-service";

type Params = { params: Promise<{ id: string }> };

const publishedSchema = z.object({
  isPublished: z.boolean(),
});

export async function PATCH(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:faqs-update:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "cms.manage" });
    const { id } = await params;
    const json = await request.json();
    const parsed = faqUpsertSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const result = await upsertAdminFaq({
      actorId: admin.id,
      id,
      data: parsed.data,
    });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not update FAQ.");
  }
}

export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:faqs-publish:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "cms.manage" });
    const { id } = await params;
    const json = await request.json();
    const parsed = publishedSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const result = await setAdminFaqPublished({
      actorId: admin.id,
      id,
      isPublished: parsed.data.isPublished,
    });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not update FAQ publish state.");
  }
}

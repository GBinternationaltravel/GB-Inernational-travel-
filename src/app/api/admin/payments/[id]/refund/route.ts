import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import { recordAdminPaymentRefund } from "@/services/admin-payment-service";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  refundReference: z.string().trim().min(4).max(120),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:payment-refund:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "payments.refund" });
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }
    const result = await recordAdminPaymentRefund({
      actorId: admin.id,
      paymentId: id,
      refundReference: parsed.data.refundReference,
      reason: parsed.data.reason,
    });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not record refund.");
  }
}

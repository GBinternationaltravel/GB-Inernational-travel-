import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import { recordOfflineAdminPayment } from "@/services/admin-payment-service";
import { OFFLINE_PAYMENT_METHODS } from "@/lib/payment/offline";

type Params = { params: Promise<{ bookingReference: string }> };

const bodySchema = z.object({
  method: z.enum(OFFLINE_PAYMENT_METHODS),
  amountReceived: z.number(),
  receiptReference: z.string().trim().min(4).max(120),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:offline-payment:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "payments.verify" });
    const { bookingReference } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const result = await recordOfflineAdminPayment({
      actorId: admin.id,
      actorRole: admin.role,
      bookingReference: decodeURIComponent(bookingReference),
      method: parsed.data.method,
      amountReceived: parsed.data.amountReceived,
      receiptReference: parsed.data.receiptReference,
      note: parsed.data.note,
    });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not record offline payment.");
  }
}

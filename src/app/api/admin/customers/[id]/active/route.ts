import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError, requireAdminApi } from "@/lib/auth/admin";
import { rateLimit } from "@/lib/security/rate-limit";
import { AdminServiceError } from "@/services/admin-booking-service";
import { setAdminCustomerActive } from "@/services/admin-customer-service";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  isActive: z.boolean(),
});

export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:customer-active:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "customers.manage" });
    const { id } = await params;
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const result = await setAdminCustomerActive({
      actorId: admin.id,
      customerId: id,
      isActive: parsed.data.isActive,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }
    if (error instanceof AdminServiceError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "FORBIDDEN_ACTION"
            ? 403
            : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "Could not update customer." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { ASSIGNABLE_STAFF_ROLES } from "@/lib/auth/permissions";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import { setAdminUserRole } from "@/services/admin-customer-service";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  role: z.enum([
    "CUSTOMER",
    "ADMIN",
    "SUPER_ADMIN",
    "MANAGER",
    "TICKET_ISSUER",
    "ACCOUNTANT",
    "SUPPORT",
    "STAFF",
    "AGENT",
  ]),
});

export async function PATCH(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:user-role:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "permissions.manage" });
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }
    if (
      parsed.data.role !== "CUSTOMER" &&
      !ASSIGNABLE_STAFF_ROLES.includes(parsed.data.role)
    ) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const result = await setAdminUserRole({
      actorId: admin.id,
      userId: id,
      role: parsed.data.role,
    });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not update role.");
  }
}

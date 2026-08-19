import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import { flightStatusUpdateSchema } from "@/lib/validations/cms";
import { updateAdminFlightStatus } from "@/services/admin-cms-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:flights-status:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "flights.manage" });
    const { id } = await params;
    const json = await request.json();
    const parsed = flightStatusUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const result = await updateAdminFlightStatus({
      actorId: admin.id,
      id,
      data: parsed.data,
    });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not update flight status.");
  }
}

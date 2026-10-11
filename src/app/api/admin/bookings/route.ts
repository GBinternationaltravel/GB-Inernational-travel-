import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminBooking } from "@/services/admin-create-booking-service";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:bookings:create:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "bookings.create" });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Please check the booking details." }, { status: 400 });
    }

    const result = await createAdminBooking(
      { actorId: admin.id, actorRole: admin.role },
      body,
    );
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not create booking.");
  }
}

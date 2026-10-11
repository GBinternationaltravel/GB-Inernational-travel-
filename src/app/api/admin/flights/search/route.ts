import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import { searchAdminInventory } from "@/services/admin-create-booking-service";
import { SupplierError, toCustomerSupplierMessage } from "@/services/flight-service";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:flights:search:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "bookings.create" });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Please check the search details." }, { status: 400 });
    }

    const result = await searchAdminInventory(
      { actorId: admin.id, actorRole: admin.role },
      body,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SupplierError) {
      return NextResponse.json(
        { error: toCustomerSupplierMessage(error), outbound: [], inbound: [] },
        { status: error.code === "INVALID_REQUEST" ? 400 : 502 },
      );
    }
    return adminCmsErrorResponse(error, "Could not search inventory.");
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import type { BookingStatus } from "@prisma/client";
import { AdminAuthError, requireAdminApi } from "@/lib/auth/admin";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  AdminServiceError,
  transitionAdminBookingStatus,
} from "@/services/admin-booking-service";
import { adminBookingStatuses } from "@/config/admin";

type Params = { params: Promise<{ bookingReference: string }> };

const bodySchema = z.object({
  status: z.string().min(1),
});

export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:booking-status:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "bookings.status" });
    const { bookingReference } = await params;
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (
      !parsed.success ||
      !adminBookingStatuses.includes(
        parsed.data.status as (typeof adminBookingStatuses)[number],
      )
    ) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const result = await transitionAdminBookingStatus({
      actorId: admin.id,
      reference: bookingReference,
      toStatus: parsed.data.status as BookingStatus,
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
    return NextResponse.json({ error: "Could not update booking." }, { status: 500 });
  }
}

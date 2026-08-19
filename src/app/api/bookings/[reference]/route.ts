import { NextResponse } from "next/server";
import { authorizeBookingPaymentAccess } from "@/lib/payment/authorize";
import { getBookingRepository } from "@/lib/booking/get-repository";
import { rateLimit } from "@/lib/security/rate-limit";
import { toSafeBookingView } from "@/lib/booking/to-safe-view";

type Params = { params: Promise<{ reference: string }> };

export async function GET(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`bookings:get:${ip}`, { limit: 40, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  const { reference } = await params;
  const access = await authorizeBookingPaymentAccess(reference);
  if (!access) {
    return NextResponse.json(
      { error: "We couldn't verify this booking session." },
      { status: 404 },
    );
  }

  const { kind } = await getBookingRepository();
  return NextResponse.json({ booking: toSafeBookingView(access.booking, kind) });
}

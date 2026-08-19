import { NextResponse } from "next/server";
import {
  BookingServiceError,
  createSupplierReservationForBooking,
} from "@/services/booking-service";
import { readBookingSessionCookie } from "@/lib/booking/session-cookie";
import { rateLimit } from "@/lib/security/rate-limit";

type Params = { params: Promise<{ reference: string }> };

/**
 * Creates a Travelport (or configured supplier) held reservation.
 * Does not charge payment and does not issue tickets.
 */
export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`bookings:supplier-book:${ip}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  const { reference } = await params;
  const session = await readBookingSessionCookie();
  if (!session || session.reference !== reference) {
    return NextResponse.json(
      { error: "We couldn't verify this booking session." },
      { status: 404 },
    );
  }

  try {
    const result = await createSupplierReservationForBooking(
      reference,
      session.token,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BookingServiceError) {
      const status =
        error.code === "EXPIRED"
          ? 410
          : error.code === "VALIDATION"
            ? 409
            : error.code === "OFFER_NOT_FOUND"
              ? 409
              : error.code === "PROVIDER"
                ? 502
                : 404;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      );
    }
    return NextResponse.json(
      { error: "We couldn't create the supplier reservation right now." },
      { status: 500 },
    );
  }
}

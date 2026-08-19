import { NextResponse } from "next/server";
import {
  BookingServiceError,
  createOrUpdateBookingDraft,
} from "@/services/booking-service";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  readBookingSessionCookie,
  setBookingSessionCookie,
} from "@/lib/booking/session-cookie";
import { getBookingFieldErrors, bookingDraftSchema } from "@/lib/validations/booking";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  const limited = rateLimit(`bookings:draft:${ip}`, { limit: 15, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Please check the passenger details." },
      { status: 400 },
    );
  }

  const parsed = bookingDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the passenger details.",
        fields: getBookingFieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  try {
    const user = await getCurrentUser();
    const existing = await readBookingSessionCookie();
    const result = await createOrUpdateBookingDraft(
      parsed.data,
      existing
        ? { reference: existing.reference, accessToken: existing.token }
        : undefined,
      user?.id ?? null,
    );
    await setBookingSessionCookie({
      reference: result.reference,
      token: result.accessToken,
    });

    return NextResponse.json({
      reference: result.reference,
      booking: result.booking,
    });
  } catch (error) {
    if (error instanceof BookingServiceError) {
      const status =
        error.code === "VALIDATION"
          ? 400
          : error.code === "OFFER_NOT_FOUND" || error.code === "SESSION_NOT_FOUND"
            ? 404
            : error.code === "EXPIRED"
              ? 410
              : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: "We couldn't save your booking right now. Please try again." },
      { status: 500 },
    );
  }
}

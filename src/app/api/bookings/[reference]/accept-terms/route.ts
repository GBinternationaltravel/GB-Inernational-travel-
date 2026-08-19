import { NextResponse } from "next/server";
import {
  BookingServiceError,
  acceptBookingTerms,
} from "@/services/booking-service";
import { readBookingSessionCookie } from "@/lib/booking/session-cookie";
import { rateLimit } from "@/lib/security/rate-limit";

type Params = { params: Promise<{ reference: string }> };

export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`bookings:terms:${ip}`, { limit: 20, windowMs: 60_000 });
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

  let accepted = false;
  try {
    const body = (await request.json()) as { accepted?: boolean };
    accepted = Boolean(body.accepted);
  } catch {
    accepted = false;
  }

  if (!accepted) {
    return NextResponse.json(
      { error: "Please confirm you have reviewed the booking details." },
      { status: 400 },
    );
  }

  try {
    const booking = await acceptBookingTerms(reference, session.token);
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof BookingServiceError) {
      const status =
        error.code === "EXPIRED" ? 410 : error.code === "VALIDATION" ? 400 : 404;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: "We couldn't update this booking right now." },
      { status: 500 },
    );
  }
}

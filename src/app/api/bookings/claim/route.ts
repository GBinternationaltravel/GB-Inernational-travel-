import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readBookingSessionCookie } from "@/lib/booking/session-cookie";
import { claimBookingForUser } from "@/services/trip-service";
import { BookingServiceError } from "@/services/booking-service";

/** Attach the current guest booking session to the authenticated user. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  }

  const session = await readBookingSessionCookie();
  if (!session) {
    return NextResponse.json({ claimed: false });
  }

  try {
    const booking = await claimBookingForUser(
      user.id,
      session.reference,
      session.token,
    );
    return NextResponse.json({ claimed: true, reference: booking.reference });
  } catch (error) {
    if (error instanceof BookingServiceError) {
      return NextResponse.json({ claimed: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ claimed: false }, { status: 500 });
  }
}

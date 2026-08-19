import { NextResponse } from "next/server";
import { z } from "zod";
import {
  BookingServiceError,
  applyAcceptedSupplierPrice,
} from "@/services/booking-service";
import { readBookingSessionCookie } from "@/lib/booking/session-cookie";
import { rateLimit } from "@/lib/security/rate-limit";

type Params = { params: Promise<{ reference: string }> };

const bodySchema = z.object({
  previousTotal: z.number().positive(),
  acceptedTotal: z.number().positive(),
  accepted: z.literal(true),
});

/**
 * Customer must explicitly accept a supplier price change before payment.
 */
export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`bookings:accept-price:${ip}`, {
    limit: 20,
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please explicitly accept the updated flight price." },
      { status: 400 },
    );
  }

  try {
    const booking = await applyAcceptedSupplierPrice(reference, session.token, {
      previousTotal: parsed.data.previousTotal,
      acceptedTotal: parsed.data.acceptedTotal,
    });
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof BookingServiceError) {
      const status =
        error.code === "EXPIRED"
          ? 410
          : error.code === "VALIDATION"
            ? 400
            : error.code === "OFFER_NOT_FOUND"
              ? 409
              : 404;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: "We couldn't update this booking price right now." },
      { status: 500 },
    );
  }
}

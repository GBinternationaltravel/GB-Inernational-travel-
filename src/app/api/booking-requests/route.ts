import { NextResponse } from "next/server";
import { bookingRequestSchema } from "@/lib/validations/booking-request";
import {
  createRequestReference,
  deliverBookingRequest,
} from "@/lib/booking/submit-booking-request";
import { rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous";
  const limited = rateLimit(`booking-request:${ip}`, { limit: 5, windowMs: 15 * 60_000 });
  if (!limited.success) {
    return NextResponse.json(
      { ok: false, message: "Please wait a few minutes before sending another request." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Please check the form and try again." }, { status: 400 });
  }

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json(
      { ok: false, message: "Please check the form and try again.", fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.companyWebsite) {
    return NextResponse.json({ ok: true, reference: createRequestReference(), emailed: false });
  }

  const reference = createRequestReference();
  const delivery = await deliverBookingRequest({
    reference,
    data: parsed.data,
    ipAddress: ip,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ ok: true, reference, emailed: delivery.emailed });
}

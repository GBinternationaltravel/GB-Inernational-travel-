import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  createPaymentCheckout,
  PaymentServiceError,
} from "@/services/payment-service";

const bodySchema = z.object({
  reference: z.string().min(6).max(32),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`payments:create:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many payment attempts. Please try again shortly." },
      { status: 429 },
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
      { error: parsed.error.issues[0]?.message ?? "Invalid booking reference." },
      { status: 400 },
    );
  }

  try {
    const result = await createPaymentCheckout(parsed.data.reference);
    return NextResponse.json({
      payment: result.payment,
      redirectUrl: result.redirectUrl,
    });
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      const status =
        error.code === "UNAUTHORIZED"
          ? 401
          : error.code === "ALREADY_PAID"
            ? 409
            : error.code === "INVALID_BOOKING" || error.code === "VALIDATION"
              ? 400
              : error.code === "PROVIDER"
                ? 502
                : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: "We couldn't start payment right now." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  handlePaymentReturn,
  PaymentServiceError,
} from "@/services/payment-service";

const bodySchema = z.object({
  paymentId: z.string().min(8),
  status: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`payments:return:${ip}`, { limit: 40, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
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
    return NextResponse.json({ error: "Invalid payment return payload." }, { status: 400 });
  }

  try {
    const result = await handlePaymentReturn({
      paymentId: parsed.data.paymentId,
      clientStatus: parsed.data.status,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      const status =
        error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: "We couldn't process the payment return." },
      { status: 500 },
    );
  }
}

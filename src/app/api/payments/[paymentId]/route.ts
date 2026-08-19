import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  getPaymentForAuthorizedUser,
  PaymentServiceError,
} from "@/services/payment-service";

type Params = { params: Promise<{ paymentId: string }> };

export async function GET(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`payments:get:${ip}`, { limit: 40, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  const { paymentId } = await params;
  try {
    const payment = await getPaymentForAuthorizedUser(paymentId);
    return NextResponse.json({ payment });
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      const status =
        error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: "We couldn't load this payment." },
      { status: 500 },
    );
  }
}

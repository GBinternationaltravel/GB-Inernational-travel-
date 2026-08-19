import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  emitMockPaymentWebhook,
  PaymentServiceError,
} from "@/services/payment-service";

const bodySchema = z.object({
  paymentId: z.string().min(8),
  status: z.enum(["SUCCEEDED", "FAILED", "CANCELLED"]),
});

/**
 * Development-only helper: completes a mock payment via the verified webhook path.
 * Disabled when the active provider is not mock.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
    return NextResponse.json({ error: "Mock payments are disabled." }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`payments:mock:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid mock payment payload." }, { status: 400 });
  }

  try {
    const result = await emitMockPaymentWebhook(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      const status =
        error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "Mock payment failed." }, { status: 500 });
  }
}

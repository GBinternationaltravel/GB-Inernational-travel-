import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  processPaymentWebhook,
  PaymentServiceError,
} from "@/services/payment-service";

type Params = { params: Promise<{ provider: string }> };

function headerMap(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
    headers[key] = value;
  });
  return headers;
}

export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`payments:webhook:${ip}`, { limit: 120, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many webhook requests." }, { status: 429 });
  }

  const { provider } = await params;
  const allowed = ["mock", "safepay"];
  if (!allowed.includes(provider.toLowerCase())) {
    return NextResponse.json({ error: "Unknown payment provider." }, { status: 404 });
  }

  const rawBody = await request.text();
  const headers = headerMap(request);

  try {
    const result = await processPaymentWebhook(provider, rawBody, headers);
    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      const status = error.code === "SIGNATURE" ? 401 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

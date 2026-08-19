import { createHmac, timingSafeEqual } from "crypto";
import { getPaymentEnv } from "@/config/payment";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  VerifyWebhookInput,
  VerifiedWebhookEvent,
} from "@/providers/payments/types";

/**
 * Development-only payment provider.
 * Never charges real money. Checkout is a local simulated page.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly code = "MOCK";
  readonly isMock = true;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const { appUrl } = getPaymentEnv();
    const providerCheckoutId = `mock_chk_${input.attemptId}`;
    const checkoutUrl = new URL("/booking/payment/mock-checkout", appUrl);
    checkoutUrl.searchParams.set("paymentId", input.paymentId);
    checkoutUrl.searchParams.set("attemptId", input.attemptId);
    checkoutUrl.searchParams.set("ref", input.bookingReference);

    return {
      provider: this.code,
      isMock: true,
      checkoutUrl: checkoutUrl.toString(),
      providerCheckoutId,
      rawResponse: {
        simulated: true,
        amount: input.amount,
        currency: input.currency,
      },
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedWebhookEvent | null> {
    const { mockWebhookSecret } = getPaymentEnv();
    const signature =
      input.headers["x-gb-mock-signature"] ?? input.headers["X-GB-MOCK-SIGNATURE"] ?? "";
    const timestamp =
      input.headers["x-gb-mock-timestamp"] ?? input.headers["X-GB-MOCK-TIMESTAMP"] ?? "";

    if (!signature || !timestamp) return null;
    if (!verifyMockSignature(mockWebhookSecret, timestamp, input.rawBody, signature)) {
      return {
        provider: this.code,
        eventType: "payment.invalid_signature",
        providerEventId: `invalid_${Date.now()}`,
        providerPaymentRef: "",
        status: "FAILED",
        amount: 0,
        currency: "PKR",
        signatureValid: false,
        rawPayload: {},
      };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    } catch {
      return null;
    }

    const statusRaw = String(payload.status ?? "PENDING").toUpperCase();
    const status =
      statusRaw === "SUCCEEDED" || statusRaw === "PAID"
        ? "SUCCEEDED"
        : statusRaw === "FAILED"
          ? "FAILED"
          : statusRaw === "CANCELLED"
            ? "CANCELLED"
            : "PENDING";

    return {
      provider: this.code,
      eventType: String(payload.eventType ?? `payment.${status.toLowerCase()}`),
      providerEventId: String(payload.eventId ?? payload.id ?? ""),
      providerPaymentRef: String(payload.paymentId ?? payload.providerPaymentRef ?? ""),
      status,
      amount: Number(payload.amount ?? 0),
      currency: String(payload.currency ?? "PKR").toUpperCase(),
      signatureValid: true,
      rawPayload: payload,
    };
  }
}

export function signMockWebhook(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return `sha256=${digest}`;
}

export function verifyMockSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  provided: string,
): boolean {
  const expected = signMockWebhook(secret, timestamp, rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

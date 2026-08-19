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
 * Safepay sandbox adapter.
 * Only constructed when official sandbox credentials are present.
 * Does not use production credentials and does not charge live cards in Phase 5.
 */
export class SafepayPaymentProvider implements PaymentProvider {
  readonly code = "SAFEPAY";
  readonly isMock = false;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const { safepay } = getPaymentEnv();
    if (!safepay.apiKey || !safepay.secret) {
      throw new Error("Safepay sandbox credentials are not configured.");
    }

    // Safepay amounts are typically in the smallest currency unit for some SDKs;
    // sandbox payment-token APIs commonly accept major units for PKR.
    const tokenResponse = await fetch(`${safepay.baseApiUrl}/order/v1/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${safepay.apiKey}`,
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        client: safepay.apiKey,
        environment: "sandbox",
        metadata: {
          bookingReference: input.bookingReference,
          paymentId: input.paymentId,
          attemptId: input.attemptId,
          ...input.metadata,
        },
      }),
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(`Safepay sandbox init failed: ${tokenResponse.status} ${text}`);
    }

    const tokenJson = (await tokenResponse.json()) as {
      data?: { token?: string };
      token?: string;
    };
    const tracker = tokenJson.data?.token ?? tokenJson.token;
    if (!tracker) {
      throw new Error("Safepay sandbox did not return a payment token.");
    }

    const checkoutUrl = new URL(`${safepay.checkoutBaseUrl}`);
    checkoutUrl.searchParams.set("beacon", tracker);
    checkoutUrl.searchParams.set("env", "sandbox");
    checkoutUrl.searchParams.set("source", "custom");
    checkoutUrl.searchParams.set("order_id", input.paymentId);
    checkoutUrl.searchParams.set("redirect_url", input.returnUrl);
    checkoutUrl.searchParams.set("cancel_url", input.cancelUrl);

    return {
      provider: this.code,
      isMock: false,
      checkoutUrl: checkoutUrl.toString(),
      providerCheckoutId: tracker,
      rawResponse: tokenJson as Record<string, unknown>,
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedWebhookEvent | null> {
    const { safepay } = getPaymentEnv();
    const signature =
      input.headers["x-sfpy-signature"] ?? input.headers["X-SFPY-SIGNATURE"] ?? "";
    const timestamp =
      input.headers["x-sfpy-timestamp"] ?? input.headers["X-SFPY-TIMESTAMP"] ?? "";

    if (!safepay.webhookSecret || !signature || !timestamp) {
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

    const valid = verifySafepaySignature(
      safepay.webhookSecret,
      timestamp,
      input.rawBody,
      signature,
    );

    if (!valid) {
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

    const data = (payload.data ?? payload) as Record<string, unknown>;
    const state = String(data.state ?? data.status ?? payload.type ?? "").toLowerCase();
    const status =
      state.includes("paid") || state.includes("success") || state.includes("tracker.complete")
        ? "SUCCEEDED"
        : state.includes("fail")
          ? "FAILED"
          : state.includes("cancel")
            ? "CANCELLED"
            : "PENDING";

    return {
      provider: this.code,
      eventType: String(payload.type ?? payload.event ?? `payment.${status.toLowerCase()}`),
      providerEventId: String(payload.id ?? data.token ?? data.tracker ?? `${Date.now()}`),
      providerPaymentRef: String(data.token ?? data.tracker ?? data.order_id ?? ""),
      status,
      amount: Number(data.amount ?? data.original_amount ?? 0),
      currency: String(data.currency ?? "PKR").toUpperCase(),
      signatureValid: true,
      rawPayload: payload,
    };
  }
}

function verifySafepaySignature(
  secretBase64: string,
  timestamp: string,
  rawBody: string,
  provided: string,
): boolean {
  try {
    const key = Buffer.from(secretBase64, "base64");
    const digest = createHmac("sha256", key)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const expected = `sha256=${digest}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

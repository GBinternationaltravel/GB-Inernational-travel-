/**
 * Payment configuration — development defaults only.
 * Never use production Safepay credentials in this codebase phase.
 */

export const paymentConfig = {
  /** Default provider when credentials are missing. */
  defaultProvider: "MOCK" as const,
  /** Allowed providers. Safepay only when sandbox credentials exist. */
  providers: ["MOCK", "SAFEPAY"] as const,
  /** How long a checkout attempt remains usable (minutes). */
  checkoutExpiryMinutes: 30,
  /** Mock webhook HMAC secret fallback (dev only). */
  mockWebhookHeader: "x-gb-mock-signature",
  mockTimestampHeader: "x-gb-mock-timestamp",
} as const;

export type PaymentProviderCode = (typeof paymentConfig.providers)[number];

export function getPaymentEnv() {
  const environment = (process.env.SAFEPAY_ENVIRONMENT ?? "").toLowerCase();
  const apiKey = process.env.SAFEPAY_API_KEY?.trim() ?? "";
  const secret = process.env.SAFEPAY_SECRET?.trim() ?? "";
  const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET?.trim() ?? "";
  const forced = (process.env.PAYMENT_PROVIDER ?? "").toUpperCase();

  const hasSandboxCredentials =
    environment === "sandbox" && Boolean(apiKey) && Boolean(secret);

  // Phase 5: Safepay only when official sandbox credentials are present.
  const safepayAllowed = hasSandboxCredentials;

  let activeProvider: PaymentProviderCode = "MOCK";
  if (forced === "MOCK") {
    activeProvider = "MOCK";
  } else if (forced === "SAFEPAY" && safepayAllowed) {
    activeProvider = "SAFEPAY";
  } else if (safepayAllowed && forced !== "MOCK") {
    activeProvider = "SAFEPAY";
  }

  return {
    activeProvider,
    safepayAllowed,
    safepay: {
      environment: "sandbox" as const,
      apiKey,
      secret,
      webhookSecret,
      baseApiUrl: "https://sandbox.api.getsafepay.com",
      checkoutBaseUrl: "https://sandbox.api.getsafepay.com/components",
    },
    mockWebhookSecret:
      process.env.PAYMENT_WEBHOOK_SECRET?.trim() ||
      process.env.SESSION_SECRET?.trim() ||
      "dev-only-mock-payment-webhook-secret",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

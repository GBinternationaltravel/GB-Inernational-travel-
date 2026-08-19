export type CreateCheckoutInput = {
  paymentId: string;
  attemptId: string;
  bookingReference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  returnUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
};

export type CreateCheckoutResult = {
  provider: string;
  isMock: boolean;
  checkoutUrl: string;
  providerCheckoutId: string;
  rawResponse?: Record<string, unknown>;
};

export type VerifyWebhookInput = {
  rawBody: string;
  headers: Record<string, string>;
};

export type VerifiedWebhookEvent = {
  provider: string;
  eventType: string;
  providerEventId: string;
  providerPaymentRef: string;
  status: "SUCCEEDED" | "FAILED" | "PENDING" | "CANCELLED";
  amount: number;
  currency: string;
  signatureValid: boolean;
  rawPayload: Record<string, unknown>;
};

export type PaymentProvider = {
  code: string;
  isMock: boolean;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedWebhookEvent | null>;
};

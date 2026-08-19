export type SafePaymentView = {
  id: string;
  bookingReference: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  isMock: boolean;
  paidAt: string | null;
  failureReason: string | null;
  checkoutUrl?: string | null;
  attemptId?: string | null;
  store: "prisma" | "file";
};

export type PaymentCheckoutResult = {
  payment: SafePaymentView;
  redirectUrl: string;
};

export type PaymentOutcome = "success" | "failure" | "pending" | "cancelled";

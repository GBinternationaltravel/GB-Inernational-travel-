import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentReturnClient } from "@/features/booking/payment-return-client";
import { LoadingState } from "@/components/ui/loading-state";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Payment Result",
    description: "Payment result for your GB International Travel booking.",
    path: "/booking/payment/return",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<LoadingState label="Checking payment result…" />}>
      <PaymentReturnClient />
    </Suspense>
  );
}

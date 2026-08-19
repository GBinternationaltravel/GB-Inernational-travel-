import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingPaymentClient } from "@/features/booking/booking-payment-client";
import { LoadingState } from "@/components/ui/loading-state";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Payment",
    description: "Secure payment for your GB International Travel booking.",
    path: "/booking/payment",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default function BookingPaymentPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading payment…" />}>
      <BookingPaymentClient />
    </Suspense>
  );
}

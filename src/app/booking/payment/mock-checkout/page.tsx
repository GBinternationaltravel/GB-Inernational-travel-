import type { Metadata } from "next";
import { Suspense } from "react";
import { MockCheckoutClient } from "@/features/booking/mock-checkout-client";
import { LoadingState } from "@/components/ui/loading-state";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Mock Payment Checkout",
    description: "Development-only simulated payment checkout.",
    path: "/booking/payment/mock-checkout",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading mock checkout…" />}>
      <MockCheckoutClient />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingConfirmationClient } from "@/features/booking/booking-confirmation-client";
import { LoadingState } from "@/components/ui/loading-state";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Payment Confirmation",
    description: "Payment received — ticket confirmation pending.",
    path: "/booking/confirmation",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading confirmation…" />}>
      <BookingConfirmationClient />
    </Suspense>
  );
}

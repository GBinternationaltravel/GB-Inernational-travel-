import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingReviewClient } from "@/features/booking/booking-review-client";
import { LoadingState } from "@/components/ui/loading-state";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Booking Review",
    description: "Review your selected flight and passenger details.",
    path: "/booking/review",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default function BookingReviewPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading booking review…" />}>
      <BookingReviewClient />
    </Suspense>
  );
}

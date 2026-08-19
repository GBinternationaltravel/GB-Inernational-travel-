import type { Metadata } from "next";
import { Suspense } from "react";
import { PassengerDetailsClient } from "@/features/booking/passenger-details-client";
import { LoadingState } from "@/components/ui/loading-state";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Passenger Details",
    description: "Enter passenger details for your booking draft.",
    path: "/booking/passengers",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default function PassengerDetailsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading passenger details…" />}>
      <PassengerDetailsClient />
    </Suspense>
  );
}

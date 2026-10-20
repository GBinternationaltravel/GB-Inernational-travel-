import type { Metadata } from "next";
import { BookingRequestForm } from "@/features/booking/booking-request-form";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Request a booking",
    description: "Send a flight booking request to GB International Travel. This is not a ticket.",
    path: "/booking/request",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default function BookingRequestPage() {
  return <BookingRequestForm />;
}

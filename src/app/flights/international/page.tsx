import type { Metadata } from "next";
import { PageHero, ComingSoonPanel } from "@/components/layout/page-shell";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "International Flights",
  description:
    "International flights from Pakistan — ready for future GDS/NDC supplier integrations.",
  path: "/flights/international",
});

export default function InternationalFlightsPage() {
  return (
    <>
      <PageHero
        title="International Flights"
        description="Search international destinations from Pakistan."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Flights", href: "/flights" },
          { label: "International" },
        ]}
      />
      <ComingSoonPanel
        title="International inventory integration planned"
        description="This page will connect through the FlightProvider abstraction once a licensed supplier is selected."
      />
    </>
  );
}

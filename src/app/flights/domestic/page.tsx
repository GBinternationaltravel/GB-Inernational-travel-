import type { Metadata } from "next";
import { PageHero, ComingSoonPanel } from "@/components/layout/page-shell";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Domestic Flights",
  description: "Domestic flights within Pakistan — architecture ready for upcoming booking phases.",
  path: "/flights/domestic",
});

export default function DomesticFlightsPage() {
  return (
    <>
      <PageHero
        title="Domestic Flights"
        description="Fly between major cities in Pakistan."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Flights", href: "/flights" },
          { label: "Domestic" },
        ]}
      />
      <ComingSoonPanel
        title="Domestic booking experience coming next"
        description="Route pages, filters, and booking steps for Pakistan domestic flights will be implemented after the foundation phase."
      />
    </>
  );
}

import type { Metadata } from "next";
import { PageHero, ComingSoonPanel } from "@/components/layout/page-shell";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Travel Guides",
  description: "Travel guides architecture for destinations from Pakistan.",
  path: "/travel-guides",
});

export default function TravelGuidesPage() {
  return (
    <>
      <PageHero
        title="Travel Guides"
        description="Guides will be published with verified content only — no fabricated travel facts."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Travel Guides" },
        ]}
      />
      <ComingSoonPanel
        title="Editorial guides coming soon"
        description="Article and DestinationGuide models are prepared in the database. Content will be added incrementally."
        ctaHref="/destinations"
        ctaLabel="Explore destinations"
      />
    </>
  );
}

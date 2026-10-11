import type { Metadata } from "next";
import { PageHero, ComingSoonPanel } from "@/components/layout/page-shell";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Deals",
  description: "Promotional flight deals from GB International Travel, published when available.",
  path: "/deals",
});

export default function DealsPage() {
  return (
    <>
      <PageHero
        title="Travel Deals"
        description="Promotional deals will appear here when we publish them. Until then, search flights or contact us for a fare."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Deals" },
        ]}
      />
      <ComingSoonPanel
        title="No published deals right now"
        description="We will not invent promotional prices. Search flights or contact us if you would like a fare."
      />
    </>
  );
}

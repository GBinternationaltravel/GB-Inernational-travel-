import type { Metadata } from "next";
import { PageHero, ComingSoonPanel } from "@/components/layout/page-shell";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Deals",
  description: "Flight deals from Pakistan — available after supplier integration.",
  path: "/deals",
});

export default function DealsPage() {
  return (
    <>
      <PageHero
        title="Travel Deals"
        description="Verified discounted offers will appear here once live inventory is connected."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Deals" },
        ]}
      />
      <ComingSoonPanel
        title="No live deals yet"
        description="Coupon and commission models are ready. We will not invent promotional prices."
      />
    </>
  );
}

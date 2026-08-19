import type { Metadata } from "next";
import Link from "next/link";
import { FlightSearchWidget } from "@/features/flights/components/flight-search-widget";
import { PageHero } from "@/components/layout/page-shell";
import { Section, SectionHeader } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";
import { mockRouteList } from "@/data/mock/flights";

export const metadata: Metadata = buildMetadata({
  title: "Flights",
  description: "Search domestic and international flights from Pakistan.",
  path: "/flights",
});

export default function FlightsPage() {
  return (
    <>
      <PageHero
        title="Flights"
        description="Search domestic and international flights. Results use clearly labeled mock development data."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Flights" },
        ]}
      />

      <Section>
        <FlightSearchWidget />
      </Section>

      <Section className="bg-white/60">
        <SectionHeader
          title="Ready to search"
          description="Submit a search to open the professional results experience with filters and sorting."
        />
        <Alert variant="info" className="mb-6">
          Example mock routes include: {mockRouteList.slice(0, 6).join(", ")}, and more.
        </Alert>
        <p className="text-sm text-[var(--color-muted)]">
          Looking for category pages?{" "}
          <Link href="/flights/domestic" className="text-[var(--color-brand)]">
            Domestic
          </Link>{" "}
          ·{" "}
          <Link href="/flights/international" className="text-[var(--color-brand)]">
            International
          </Link>
        </p>
      </Section>
    </>
  );
}

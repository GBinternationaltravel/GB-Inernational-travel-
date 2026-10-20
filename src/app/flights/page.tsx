import type { Metadata } from "next";
import Link from "next/link";
import { FlightSearchWidget } from "@/features/flights/components/flight-search-widget";
import { FaresUpdatedLine } from "@/components/flights/fares-updated-line";
import { PageHero } from "@/components/layout/page-shell";
import { Section, SectionHeader } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublishedFaresUpdatedAt } from "@/providers/flights/inventory-flight-supplier";

export const metadata: Metadata = buildMetadata({
  title: "Flights",
  description: "Search domestic and international flights from Pakistan.",
  path: "/flights",
});

export const revalidate = 3600;

export default async function FlightsPage() {
  const faresUpdatedAt = await getPublishedFaresUpdatedAt();

  return (
    <>
      <PageHero
        title="Flights"
        description="Search domestic and international flights from the inventory we currently publish. Fares and seats are confirmed by our team, not by a live airline connection."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Flights" },
        ]}
      />

      <Section>
        <FaresUpdatedLine updatedAt={faresUpdatedAt} />
        <div className="mt-4">
          <FlightSearchWidget />
        </div>
      </Section>

      <Section className="bg-white/60">
        <SectionHeader
          title="Ready to search"
          description="Submit a search to open the professional results experience with filters and sorting."
        />
        <Alert variant="info" className="mb-6">
          Popular published routes include Islamabad–Skardu, Islamabad–Gilgit, Islamabad–Dubai and
          others, when those flights are listed.
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

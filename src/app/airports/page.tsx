import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";
import { airports } from "@/data/airports";

export const metadata: Metadata = buildMetadata({
  title: "Airports",
  description: "Airport codes and cities used in GB International Travel flight search.",
  path: "/airports",
});

export default function AirportsPage() {
  return (
    <>
      <PageHero
        title="Airports"
        description="Airport codes and cities you can use when searching published flights."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Airports" },
        ]}
      />
      <Section>
        <Alert variant="info" className="mb-6">
          These are public airport names and IATA codes used in search. Listing an airport does not
          mean a flight is available until our team confirms it.
        </Alert>
        <div className="space-y-4">
          {airports.map((airport) => (
            <div
              key={airport.iataCode}
              className="flex flex-col gap-1 border-b border-[var(--color-border)] py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {airport.name} ({airport.iataCode})
                </p>
                <p className="text-sm text-[var(--color-muted)]">
                  {airport.city}, {airport.country}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

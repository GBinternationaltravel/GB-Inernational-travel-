import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";
import { airports } from "@/data/airports";

export const metadata: Metadata = buildMetadata({
  title: "Airports",
  description: "Airport reference list used during foundation development.",
  path: "/airports",
});

export default function AirportsPage() {
  return (
    <>
      <PageHero
        title="Airports"
        description="Reference airports for search UI development. Expanded airport content comes later."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Airports" },
        ]}
      />
      <Section>
        <Alert variant="info" className="mb-6">
          Codes and public airport names below are for development reference only.
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

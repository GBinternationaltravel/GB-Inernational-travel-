import type { Metadata } from "next";
import { PageHero, ComingSoonPanel } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";
import { airlines } from "@/data/airlines";

export const metadata: Metadata = buildMetadata({
  title: "Airlines",
  description: "Airline directory architecture for future verified airline profiles.",
  path: "/airlines",
});

export default function AirlinesPage() {
  return (
    <>
      <PageHero
        title="Airlines"
        description="Airline names used in mock search results. Logos are omitted until legitimate assets are available."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Airlines" },
        ]}
      />
      <Section>
        <Alert variant="info" className="mb-6">
          These airlines appear in development mock inventory only.
        </Alert>
        <div className="space-y-3">
          {airlines.map((airline) => (
            <div
              key={airline.id}
              className="flex items-center justify-between border-b border-[var(--color-border)] py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-surface-muted)] text-xs font-semibold text-[var(--color-brand)]">
                  {airline.iataCode}
                </span>
                <p className="font-medium">{airline.name}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <ComingSoonPanel
        title="Full airline profiles planned"
        description="Detailed airline pages will be added with verified public information only."
        ctaHref="/airports"
        ctaLabel="View airports"
      />
    </>
  );
}

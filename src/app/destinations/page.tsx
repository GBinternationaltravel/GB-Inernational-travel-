import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-shell";
import { Section, SectionHeader } from "@/components/ui/section";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  destinationCities,
  destinationCountries,
  destinationPath,
} from "@/data/destinations/catalog";
import { breadcrumbJsonLd } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Destinations",
  description:
    "Explore Pakistan and major international destinations with airport info, travel tips, and flight search links.",
  path: "/destinations",
});

export default function DestinationsPage() {
  const domestic = destinationCities.filter((c) => c.isDomestic);
  const international = destinationCities.filter((c) => !c.isDomestic);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Destinations", path: "/destinations" },
            ]),
          ),
        }}
      />

      <PageHero
        title="Destinations"
        description="City guides for popular routes from Pakistan — with sample weather, travel tips, and flight search links."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Destinations" },
        ]}
      />

      <Section>
        <SectionHeader title="Browse by country" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinationCountries.map((country) => (
            <Link
              key={country.countrySlug}
              href={destinationPath(country.countrySlug)}
              className="border-b border-[var(--color-border)] pb-3"
            >
              <h2 className="font-display text-xl">{country.countryName}</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{country.summary}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section className="bg-white/60">
        <SectionHeader title="Pakistan" />
        <div className="grid gap-6 sm:grid-cols-3">
          {domestic.map((item) => (
            <Link
              key={item.citySlug}
              href={destinationPath(item.countrySlug, item.citySlug)}
              className="border-b border-[var(--color-border)] pb-4"
            >
              <h2 className="font-display text-2xl">{item.cityName}</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{item.iataCode}</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{item.summary}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader title="International" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {international.map((item) => (
            <Link
              key={item.citySlug}
              href={destinationPath(item.countrySlug, item.citySlug)}
              className="border-b border-[var(--color-border)] pb-4"
            >
              <h2 className="font-display text-2xl">{item.cityName}</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {item.countryName} · {item.iataCode}
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{item.summary}</p>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}

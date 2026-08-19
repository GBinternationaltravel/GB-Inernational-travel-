import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import {
  destinationCountries,
  destinationPath,
  getCitiesForCountry,
  getCountryBySlug,
} from "@/data/destinations/catalog";
import {
  destinationCountryJsonLd,
  destinationCountryMetadata,
} from "@/lib/seo/destination-seo";

type Params = { params: Promise<{ country: string }> };

export function generateStaticParams() {
  return destinationCountries.map((item) => ({ country: item.countrySlug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { country } = await params;
  const destination = getCountryBySlug(country);
  if (!destination) return {};
  return destinationCountryMetadata(destination);
}

export default async function DestinationCountryPage({ params }: Params) {
  const { country } = await params;
  const destination = getCountryBySlug(country);
  if (!destination) notFound();

  const cities = getCitiesForCountry(country);
  const schemas = destinationCountryJsonLd(destination);

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <PageHero
        title={destination.countryName}
        description={destination.summary}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Destinations", href: "/destinations" },
          { label: destination.countryName },
        ]}
      />

      <Section>
        <h2 className="font-display text-2xl">Cities</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
          Choose a city guide for airport details, sample weather, travel tips, and flight
          search links.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((item) => (
            <Link
              key={item.citySlug}
              href={destinationPath(item.countrySlug, item.citySlug)}
              className="border-b border-[var(--color-border)] pb-4"
            >
              <h3 className="font-display text-xl">{item.cityName}</h3>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{item.iataCode}</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{item.summary}</p>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}

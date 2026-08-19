import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { WeatherWidget } from "@/components/weather/weather-widget";
import {
  DestinationFaqList,
  DestinationSearchCta,
  RelatedDestinations,
} from "@/components/destinations/destination-sections";
import {
  destinationCities,
  destinationPath,
  getCityBySlugs,
  getRelatedCities,
} from "@/data/destinations/catalog";
import { getDestinationWeather } from "@/services/weather-service";
import {
  destinationCityJsonLd,
  destinationCityMetadata,
} from "@/lib/seo/destination-seo";

type Params = { params: Promise<{ country: string; city: string }> };

export function generateStaticParams() {
  return destinationCities.map((item) => ({
    country: item.countrySlug,
    city: item.citySlug,
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { country, city } = await params;
  const destination = getCityBySlugs(country, city);
  if (!destination) return {};
  return destinationCityMetadata(destination);
}

export default async function DestinationCityPage({ params }: Params) {
  const { country, city } = await params;
  const destination = getCityBySlugs(country, city);
  if (!destination) notFound();

  const weather = await getDestinationWeather(destination.iataCode);
  const related = getRelatedCities(destination);
  const schemas = destinationCityJsonLd(destination);

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
        title={`${destination.cityName}, ${destination.countryName}`}
        description={destination.summary}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Destinations", href: "/destinations" },
          {
            label: destination.countryName,
            href: destinationPath(destination.countrySlug),
          },
          { label: destination.cityName },
        ]}
      />

      <Section>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <section>
              <h2 className="font-display text-2xl">Quick answer</h2>
              <p className="mt-3 text-[var(--color-muted)]">
                {destination.cityName} ({destination.iataCode}) is a{" "}
                {destination.isDomestic ? "Pakistan domestic" : "international"} destination
                served via {destination.airportName}. Best for: {destination.bestFor}
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl">Airport</h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--color-muted)]">Airport</dt>
                  <dd className="font-medium">{destination.airportName}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">IATA code</dt>
                  <dd className="font-medium">{destination.iataCode}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2 className="font-display text-2xl">Popular flight routes</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {destination.popularRoutes.map((route) => (
                  <li key={route.label}>
                    <Link
                      href={`/flights?from=${encodeURIComponent(route.fromIata)}&to=${encodeURIComponent(destination.iataCode)}`}
                      className="text-[var(--color-brand)]"
                    >
                      {route.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl">Best time to visit</h2>
              <p className="mt-3 text-sm text-[var(--color-muted)]">
                {destination.bestTimeToVisit}
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl">Travel tips</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--color-muted)]">
                {destination.travelTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl">Visa & travel information</h2>
              <p className="mt-3 text-sm text-[var(--color-muted)]">{destination.visaInfo}</p>
            </section>

            <DestinationFaqList faqs={destination.faqs} />
            <RelatedDestinations cities={related} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <WeatherWidget forecast={weather} />
            <DestinationSearchCta city={destination} />
          </aside>
        </div>
      </Section>
    </>
  );
}

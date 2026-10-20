import Link from "next/link";
import type { DestinationCity } from "@/data/destinations/catalog";
import { destinationPath } from "@/data/destinations/catalog";
import { siteConfig } from "@/config/site";
import { telHref, whatsappHref } from "@/lib/contact-links";

export function DestinationSearchCta({ city }: { city: DestinationCity }) {
  const from = city.relatedFlightSearch.from ?? "ISB";
  const to = city.relatedFlightSearch.to;
  const href = `/flights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const quote = city.hasCommercialAirport
    ? `Hi ${siteConfig.name}, please quote flights ${from} to ${to} (${city.cityName}).`
    : `Hi ${siteConfig.name}, I'm planning a trip to ${city.cityName}. Please advise flights and the road transfer.`;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <h2 className="font-display text-2xl">
        {city.hasCommercialAirport ? `Flights to ${city.cityName}` : `Getting to ${city.cityName}`}
      </h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {city.hasCommercialAirport
          ? `Search fares we have published for ${from} → ${to}. If the list is empty, that route needs a quote. Fares are indicative and confirmed when you request a booking. This is not a live airline search.`
          : `${city.cityName} has no commercial airport. The nearest flights we can search are ${from} → ${to}. Ask us to plan the road journey from there.`}
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={href}
          className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-brand)] px-5 text-sm font-medium text-white"
        >
          Search {from} → {to}
        </Link>
        <a
          href={whatsappHref(siteConfig.contactWhatsApp, quote)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-white px-5 text-sm font-medium text-[var(--color-navy)]"
        >
          {siteConfig.contactWhatsAppLabel} {siteConfig.contactWhatsApp}
        </a>
        <a
          href={telHref(siteConfig.contactPhone)}
          className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-white px-5 text-sm font-medium text-[var(--color-navy)]"
        >
          {siteConfig.contactPhoneLabel} {siteConfig.contactPhone}
        </a>
      </div>
    </div>
  );
}

export function SeasonalTravelNote({ city }: { city: DestinationCity }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
      <h2 className="text-xl font-semibold text-[var(--color-navy)]">Typical season in {city.cityName}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]">{city.bestTimeToVisit}</p>
      {city.climateNote ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{city.climateNote}</p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
          Use the season above as a planning guide. It is not a temperature reading for today.
        </p>
      )}
      <p className="mt-3 text-xs text-[var(--color-muted)]">
        Not a live forecast. Check the weather again close to departure, especially for mountain flights.
      </p>
    </section>
  );
}

export function RelatedTours({
  city,
  tours,
}: {
  city: DestinationCity;
  tours: Array<{ slug: string; name: string; durationDays: number }>;
}) {
  if (!city.tourQuery) return null;
  const href = `/tours?destination=${encodeURIComponent(city.tourQuery)}`;
  const message = `Hi ${siteConfig.name}, I'd like a tour quote for ${city.cityName}.`;

  return (
    <section>
      <h2 className="font-display text-2xl">Tours</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Tour requests are planned with our team. A listing is not a confirmed hotel, jeep or guide.
      </p>
      {tours.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {tours.map((tour) => (
            <li key={tour.slug}>
              <Link href={`/tours/${tour.slug}`} className="text-[var(--color-brand)]">
                {tour.name}
              </Link>
              <span className="text-[var(--color-muted)]"> · {tour.durationDays} days</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          No published {city.cityName} package is on the site right now.
        </p>
      )}
      <p className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link href={href} className="font-medium text-[var(--color-brand)]">
          Browse {city.cityName} tours
        </Link>
        <a
          href={whatsappHref(siteConfig.contactWhatsApp, message)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--color-brand)]"
        >
          Request a tour on WhatsApp
        </a>
      </p>
    </section>
  );
}

export function RelatedDestinations({ cities }: { cities: DestinationCity[] }) {
  if (cities.length === 0) return null;

  return (
    <div>
      <h2 className="font-display text-2xl">Related destinations</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {cities.map((item) => (
          <li key={`${item.countrySlug}-${item.citySlug}`}>
            <Link
              href={destinationPath(item.countrySlug, item.citySlug)}
              className="block border-b border-[var(--color-border)] pb-3 text-sm"
            >
              <span className="font-medium text-[var(--color-brand)]">{item.cityName}</span>
              <span className="text-[var(--color-muted)]"> · {item.countryName}</span>
              <p className="mt-1 text-[var(--color-muted)] line-clamp-2">{item.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DestinationFaqList({
  faqs,
}: {
  faqs: Array<{ id: string; question: string; answer: string }>;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl">Frequently asked questions</h2>
      <div className="mt-4 space-y-4">
        {faqs.map((faq) => (
          <details key={faq.id} className="border-b border-[var(--color-border)] pb-3">
            <summary className="cursor-pointer font-medium">{faq.question}</summary>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{faq.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

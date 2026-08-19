import Link from "next/link";
import type { DestinationCity } from "@/data/destinations/catalog";
import { destinationPath } from "@/data/destinations/catalog";

export function DestinationSearchCta({ city }: { city: DestinationCity }) {
  const from = city.relatedFlightSearch.from ?? "ISB";
  const to = city.relatedFlightSearch.to;
  const href = `/flights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <h2 className="font-display text-2xl">Search flights to {city.cityName}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Start with a common Pakistan route into {city.iataCode}. Live inventory depends on the
        configured flight supplier.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-5 text-sm font-medium text-white"
      >
        Search {from} → {to}
      </Link>
    </div>
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
          <details
            key={faq.id}
            className="border-b border-[var(--color-border)] pb-3"
          >
            <summary className="cursor-pointer font-medium">{faq.question}</summary>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{faq.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

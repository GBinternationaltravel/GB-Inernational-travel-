import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { listPublishedTours } from "@/services/tour-service";

export const metadata: Metadata = buildMetadata({
  title: "Gilgit-Baltistan Tours",
  description:
    "Sample tour packages for Hunza, Skardu, Gilgit, Naltar, Khunjerab, Fairy Meadows, and Deosai. Requests are inquiry-based.",
  path: "/tours",
});

type Props = {
  searchParams: Promise<{ destination?: string }>;
};

const featuredDestinations = [
  "HUNZA",
  "SKARDU",
  "GILGIT",
  "NALTAR",
  "KHUNJERAB",
  "FAIRY_MEADOWS",
  "DEOSAI",
] as const;

export default async function ToursPage({ searchParams }: Props) {
  const params = await searchParams;
  const tours = await listPublishedTours({ destination: params.destination });

  return (
    <>
      <PageHero
        title="Explore Gilgit-Baltistan"
        description="Curated tour packages across Pakistan’s northern destinations. Selecting a tour starts an inquiry — availability is confirmed by our team."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Tours" },
        ]}
      />
      <Section>
        <div className="mb-8 flex flex-wrap gap-2">
          {featuredDestinations.map((dest) => (
            <Link
              key={dest}
              href={`/tours?destination=${dest}`}
              className={`rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                params.destination === dest
                  ? "border-[var(--color-emerald)] bg-[var(--color-emerald)] text-white"
                  : "border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:border-[var(--color-emerald)] hover:text-[var(--color-emerald)]"
              }`}
            >
              {dest.replaceAll("_", " ")}
            </Link>
          ))}
        </div>

        <Alert variant="info" className="mb-6" title="Inquiry-based requests">
          Availability is confirmed by our team after you submit traveler details. Prices shown
          are package estimates and may change.
        </Alert>

        <form className="mb-6 flex flex-wrap gap-3">
          <select
            name="destination"
            defaultValue={params.destination ?? ""}
            className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-sm"
          >
            <option value="">All destinations</option>
            {featuredDestinations.map((dest) => (
              <option key={dest} value={dest}>
                {dest.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-emerald-dark)]"
          >
            Filter
          </button>
        </form>

        {tours.length === 0 ? (
          <Alert variant="info" title="No published tours">
            Tour packages will appear here once published in the admin CMS.
          </Alert>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <li
                key={tour.id}
                className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
              >
                <div
                  className="h-36 bg-gradient-to-br from-[var(--color-navy)] via-[#1a3a5c] to-[var(--color-emerald)]"
                  aria-hidden
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="navy">{tour.destination.replaceAll("_", " ")}</Badge>
                    <Badge variant="info">{tour.season}</Badge>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-[var(--color-navy)]">
                    <Link href={`/tours/${tour.slug}`} className="hover:text-[var(--color-emerald)]">
                      {tour.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {tour.durationDays} days
                  </p>
                  {tour.description ? (
                    <p className="mt-2 line-clamp-3 text-sm text-[var(--color-muted)]">
                      {tour.description}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <p className="text-lg font-bold text-[var(--color-navy)]">
                      From {Number(tour.price).toLocaleString()} {tour.currency}
                    </p>
                    <Link
                      href={`/tours/${tour.slug}`}
                      className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-emerald-dark)]"
                    >
                      View Tour
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import {
  breadcrumbJsonLd,
  buildMetadata,
  tourPackageJsonLd,
} from "@/lib/seo/metadata";
import { getPublishedTourBySlug, jsonListAsArray } from "@/services/tour-service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getPublishedTourBySlug(slug);
  if (!tour) {
    return buildMetadata({ title: "Tour", path: `/tours/${slug}`, noIndex: true });
  }
  return buildMetadata({
    title: tour.name,
    description: tour.description ?? undefined,
    path: `/tours/${tour.slug}`,
  });
}

export default async function TourDetailPage({ params }: Props) {
  const { slug } = await params;
  const tour = await getPublishedTourBySlug(slug);
  if (!tour) notFound();

  const highlights = jsonListAsArray(tour.highlights);
  const itinerary = jsonListAsArray(tour.itinerary);
  const destinationName = tour.destination.replaceAll("_", " ");
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Tours", path: "/tours" },
      { name: tour.name, path: `/tours/${tour.slug}` },
    ]),
    tourPackageJsonLd({
      name: tour.name,
      description: tour.description,
      path: `/tours/${tour.slug}`,
      price: Number(tour.price),
      currency: tour.currency,
      destinationName,
    }),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        title={tour.name}
        description={`${destinationName} · ${tour.season} · ${tour.durationDays} days`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Tours", href: "/tours" },
          { label: tour.name },
        ]}
      />
      <Section>
        <Alert variant="info" className="mb-6" title="Sample package / inquiry request">
          This is a published package for inquiry purposes. Submitting a request does not reserve
          seats or rooms until our team confirms.
        </Alert>

        {tour.description ? (
          <p className="max-w-3xl text-sm leading-7 text-[var(--color-muted)]">{tour.description}</p>
        ) : null}

        <p className="mt-4 font-display text-2xl">
          {Number(tour.price).toLocaleString()} {tour.currency}
        </p>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          {tour.hotel ? (
            <div>
              <dt className="text-[var(--color-muted)]">Hotel</dt>
              <dd className="font-medium">{tour.hotel}</dd>
            </div>
          ) : null}
          {tour.transport ? (
            <div>
              <dt className="text-[var(--color-muted)]">Transport</dt>
              <dd className="font-medium">{tour.transport}</dd>
            </div>
          ) : null}
          {tour.meals ? (
            <div>
              <dt className="text-[var(--color-muted)]">Meals</dt>
              <dd className="font-medium">{tour.meals}</dd>
            </div>
          ) : null}
        </dl>

        {highlights.length > 0 ? (
          <div className="mt-8">
            <h2 className="font-display text-xl">Highlights</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {itinerary.length > 0 ? (
          <div className="mt-8">
            <h2 className="font-display text-xl">Itinerary</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
              {itinerary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        ) : null}

        {(tour.included || tour.excluded) && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {tour.included ? (
              <div>
                <h2 className="font-display text-xl">Included</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-muted)]">
                  {tour.included}
                </p>
              </div>
            ) : null}
            {tour.excluded ? (
              <div>
                <h2 className="font-display text-xl">Excluded</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-muted)]">
                  {tour.excluded}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {tour.availabilityNote ? (
          <p className="mt-6 text-sm text-[var(--color-muted)]">{tour.availabilityNote}</p>
        ) : null}

        <div className="mt-8">
          <Link
            href={`/tours/${tour.slug}/book`}
            className="inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
          >
            Select & request
          </Link>
        </div>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { buildMetadata } from "@/lib/seo/metadata";
import { TourReviewClient } from "@/features/tours/tour-review-client";
import { getPublishedTourBySlug } from "@/services/tour-service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadata({
    title: "Review tour inquiry",
    path: `/tours/${slug}/review`,
    noIndex: true,
  });
}

export default async function TourReviewPage({ params }: Props) {
  const { slug } = await params;
  const tour = await getPublishedTourBySlug(slug);
  if (!tour) notFound();

  return (
    <>
      <PageHero
        title="Review"
        description="Confirm your inquiry details before submitting."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Tours", href: "/tours" },
          { label: tour.name, href: `/tours/${tour.slug}` },
          { label: "Review" },
        ]}
      />
      <Section>
        <TourReviewClient
          tourSlug={tour.slug}
          tourName={tour.name}
          price={Number(tour.price)}
          currency={tour.currency}
        />
      </Section>
    </>
  );
}

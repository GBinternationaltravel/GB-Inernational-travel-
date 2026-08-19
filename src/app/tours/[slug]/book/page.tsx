import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { buildMetadata } from "@/lib/seo/metadata";
import { TourBookForm } from "@/features/tours/tour-inquiry-forms";
import { getPublishedTourBySlug } from "@/services/tour-service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getPublishedTourBySlug(slug);
  return buildMetadata({
    title: tour ? `Request ${tour.name}` : "Tour request",
    path: `/tours/${slug}/book`,
    noIndex: true,
  });
}

export default async function TourBookPage({ params }: Props) {
  const { slug } = await params;
  const tour = await getPublishedTourBySlug(slug);
  if (!tour) notFound();

  return (
    <>
      <PageHero
        title="Traveler details"
        description="Tell us who is traveling. This creates an inquiry draft for review."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Tours", href: "/tours" },
          { label: tour.name, href: `/tours/${tour.slug}` },
          { label: "Book" },
        ]}
      />
      <Section>
        <TourBookForm tourSlug={tour.slug} tourName={tour.name} />
      </Section>
    </>
  );
}

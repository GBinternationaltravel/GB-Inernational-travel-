import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  getPublishedTourBySlug,
  getTourInquiryByReference,
} from "@/services/tour-service";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadata({
    title: "Tour inquiry confirmation",
    path: `/tours/${slug}/confirmation`,
    noIndex: true,
  });
}

export default async function TourConfirmationPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const tour = await getPublishedTourBySlug(slug);
  if (!tour) notFound();

  const inquiry = ref ? await getTourInquiryByReference(ref) : null;
  const valid = inquiry && inquiry.tour.slug === slug;

  return (
    <>
      <PageHero
        title="Inquiry recorded"
        description="Your tour request has been saved. This is not a live inventory confirmation."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Tours", href: "/tours" },
          { label: tour.name, href: `/tours/${tour.slug}` },
          { label: "Confirmation" },
        ]}
      />
      <Section>
        {!valid ? (
          <Alert variant="warning" title="Reference not found">
            We could not find that inquiry reference for this tour. If you just submitted, check
            the confirmation link or contact support with your email.
          </Alert>
        ) : (
          <div className="max-w-xl space-y-4 rounded-xl border border-[var(--color-border)] bg-white p-5">
            <Alert variant="success" title="Request received">
              Status: {inquiry.status}. Our team will follow up to confirm availability and
              pricing.
            </Alert>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-[var(--color-muted)]">Reference</dt>
                <dd className="font-medium">{inquiry.reference}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Package</dt>
                <dd className="font-medium">{inquiry.tour.name}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Traveler</dt>
                <dd className="font-medium">{inquiry.travelerName}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Email</dt>
                <dd className="font-medium">{inquiry.travelerEmail}</dd>
              </div>
            </dl>
          </div>
        )}

        <p className="mt-6 text-sm">
          <Link href="/tours" className="text-[var(--color-brand)]">
            Browse more tours
          </Link>
        </p>
      </Section>
    </>
  );
}

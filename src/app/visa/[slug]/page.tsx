import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import {
  breadcrumbJsonLd,
  buildMetadata,
  visaGuideJsonLd,
} from "@/lib/seo/metadata";
import { getPublishedVisaGuideBySlug } from "@/services/visa-guide-service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPublishedVisaGuideBySlug(slug);
  if (!guide) {
    return buildMetadata({ title: "Visa guide", path: `/visa/${slug}`, noIndex: true });
  }
  return buildMetadata({
    title: guide.seoTitle || `${guide.countryName} visa information`,
    description:
      guide.seoDescription ||
      `Informational visa guidance for ${guide.countryName}. Verify with official authorities.`,
    path: `/visa/${guide.slug}`,
  });
}

function Block({ title, body }: { title: string; body?: string | null }) {
  if (!body?.trim()) return null;
  return (
    <div className="mt-6">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--color-muted)]">
        {body}
      </p>
    </div>
  );
}

export default async function VisaGuideDetailPage({ params }: Props) {
  const { slug } = await params;
  const guide = await getPublishedVisaGuideBySlug(slug);
  if (!guide) notFound();

  const title = `${guide.countryName}${guide.cityName ? ` · ${guide.cityName}` : ""}`;
  const description =
    guide.seoDescription ||
    `Informational visa guidance for ${guide.countryName}. Verify with official authorities.`;
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Visa", path: "/visa" },
      { name: title, path: `/visa/${guide.slug}` },
    ]),
    visaGuideJsonLd({
      title: guide.seoTitle || `${guide.countryName} visa information`,
      description,
      path: `/visa/${guide.slug}`,
      countryName: guide.countryName,
    }),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        title={title}
        description={guide.visaType ?? "Visa information"}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Visa", href: "/visa" },
          { label: title },
        ]}
      />
      <Section>
        <Alert variant="warning" className="mb-6" title="Disclaimer">
          Requirements change frequently. Always verify eligibility, documents, processing times,
          and fees with the destination country&apos;s official embassy, consulate, or government
          website before applying or traveling. GB International Travel does not guarantee visa
          approval.
        </Alert>

        <Block title="Eligibility" body={guide.eligibility} />
        <Block title="Required documents" body={guide.requiredDocuments} />
        <Block title="Processing" body={guide.processingInfo} />
        <Block title="Duration" body={guide.duration} />
        <Block title="Fees" body={guide.feesNote} />
        <Block title="Important notes" body={guide.importantNotes} />

        {guide.officialSourceUrl ? (
          <p className="mt-6 text-sm">
            Official source:{" "}
            <a
              href={guide.officialSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-brand)] underline"
            >
              {guide.officialSourceUrl}
            </a>
          </p>
        ) : null}

        <p className="mt-6 text-xs text-[var(--color-muted)]">
          Last updated {new Date(guide.lastUpdatedAt).toLocaleDateString()}
        </p>
      </Section>
    </>
  );
}

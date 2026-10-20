import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { articleJsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo/metadata";
import { isSampleTravelUpdate } from "@/lib/travel-updates/sample-slugs";
import { getPublicTravelUpdate, listPublicTravelUpdates } from "@/lib/travel-updates/public-feed";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const items = await listPublicTravelUpdates({ includeSamples: true });
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicTravelUpdate(slug);
  if (!item) {
    return buildMetadata({ title: "Travel update", path: `/travel-updates/${slug}`, noIndex: true });
  }
  return buildMetadata({
    title: item.title,
    description: item.summary || undefined,
    path: `/travel-updates/${item.slug}`,
    noIndex: isSampleTravelUpdate(slug),
  });
}

export default async function TravelUpdateDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = await getPublicTravelUpdate(slug);
  if (!item) notFound();

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Travel Updates", path: "/travel-updates" },
      { name: item.title, path: `/travel-updates/${item.slug}` },
    ]),
    articleJsonLd({
      title: item.title,
      description: item.summary || item.title,
      path: `/travel-updates/${item.slug}`,
      datePublished: item.publishedAt ?? undefined,
      dateModified: item.updatedAt ?? undefined,
    }),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        title={item.title}
        description={item.summary || undefined}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Travel Updates", href: "/travel-updates" },
          { label: item.title },
        ]}
      />
      <Section>
        <p className="mb-4 text-xs tracking-wide text-[var(--color-muted)] uppercase">
          {item.category}
          {item.publishedAt ? ` · ${item.publishedAt.slice(0, 10)}` : ""}
          {item.source ? ` · ${item.source}` : ""}
        </p>
        {item.review ? (
          <Alert variant="warning" className="mb-4" title={item.review}>
            This note is general guidance. Confirm it with our team before you travel. It is not a live
            report, a visa decision, or a ticket.
          </Alert>
        ) : null}
        {item.sample ? (
          <Alert variant="warning" className="mb-4" title="Sample page">
            This is sample content kept for the existing address. It is not a current travel notice.
          </Alert>
        ) : null}
        <article className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[var(--color-ink)]">
          {item.body}
        </article>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  buildMetadata,
} from "@/lib/seo/metadata";
import { getPublishedTravelUpdateBySlug } from "@/services/travel-update-service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedTravelUpdateBySlug(slug);
  if (!item) {
    return buildMetadata({
      title: "Travel update",
      path: `/travel-updates/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: item.title,
    description: item.summary ?? undefined,
    path: `/travel-updates/${item.slug}`,
  });
}

export default async function TravelUpdateDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = await getPublishedTravelUpdateBySlug(slug);
  if (!item) notFound();

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Travel Updates", path: "/travel-updates" },
      { name: item.title, path: `/travel-updates/${item.slug}` },
    ]),
    articleJsonLd({
      title: item.title,
      description: item.summary ?? item.title,
      path: `/travel-updates/${item.slug}`,
      datePublished: item.publishedAt?.toISOString?.() ?? undefined,
      dateModified: item.updatedAt?.toISOString?.() ?? undefined,
    }),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        title={item.title}
        description={item.summary ?? undefined}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Travel Updates", href: "/travel-updates" },
          { label: item.title },
        ]}
      />
      <Section>
        <div className="mb-4 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">
          <span>{item.type}</span>
          <span>·</span>
          <span>{item.priority}</span>
          {item.region ? (
            <>
              <span>·</span>
              <span>{item.region}</span>
            </>
          ) : null}
        </div>
        {(item.priority === "HIGH" || item.priority === "URGENT") && (
          <Alert variant="warning" className="mb-4" title={`${item.priority} priority`}>
            Please read carefully before traveling in the affected region.
          </Alert>
        )}
        <article className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[var(--color-ink)]">
          {item.body}
        </article>
        {item.expiresAt ? (
          <p className="mt-6 text-xs text-[var(--color-muted)]">
            Expires {new Date(item.expiresAt).toLocaleString()}
          </p>
        ) : null}
      </Section>
    </>
  );
}

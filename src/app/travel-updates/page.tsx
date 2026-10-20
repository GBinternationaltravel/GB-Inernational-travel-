import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { travelUpdateCategories } from "@/lib/travel-updates/markdown-feed";
import { listPublicTravelUpdates } from "@/lib/travel-updates/public-feed";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Travel Updates",
  description:
    "Flight, road, weather, Umrah and visa notes from GB International Travel. These are not live operational reports.",
  path: "/travel-updates",
});

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function TravelUpdatesPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category?.trim() ?? "";
  const items = await listPublicTravelUpdates({
    category: category || undefined,
    includeSamples: true,
  });

  return (
    <>
      <PageHero
        title="Travel Updates"
        description="Notes on flights, roads, weather, Umrah and visas. A note is not a live status, a visa approval, or a ticket."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Travel Updates" },
        ]}
      />
      <Section>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          <Link href="/travel-updates/rss.xml" className="font-medium text-[var(--color-brand)]">
            RSS feed
          </Link>
        </p>
        <form className="mb-6 flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="sr-only">Category</span>
            <select
              name="category"
              defaultValue={category}
              className="h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-sm"
            >
              <option value="">All categories</option>
              {travelUpdateCategories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
              <option value="Tourism">Tourism</option>
              <option value="Advisory">Advisory</option>
            </select>
          </label>
          <button
            type="submit"
            className="h-11 rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-4 text-sm font-semibold text-white"
          >
            Filter
          </button>
        </form>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No notes in this category yet.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.slug} className="rounded-xl border border-[var(--color-border)] bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{item.category}</Badge>
                  {item.sample ? <Badge variant="warning">Sample</Badge> : null}
                  {item.review ? <Badge variant="warning">{item.review}</Badge> : null}
                </div>
                <h2 className="mt-3 font-display text-2xl">
                  <Link href={`/travel-updates/${item.slug}`} className="hover:underline">
                    {item.title}
                  </Link>
                </h2>
                {item.summary ? <p className="mt-2 text-sm text-[var(--color-muted)]">{item.summary}</p> : null}
                <p className="mt-3 text-xs text-[var(--color-muted)]">
                  {item.publishedAt ? <time dateTime={item.publishedAt}>{item.publishedAt.slice(0, 10)}</time> : "Date not set"}
                  {item.source ? ` · ${item.source}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

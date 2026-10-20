import { listMarkdownTravelUpdates, type MarkdownTravelUpdate } from "@/lib/travel-updates/markdown-feed";
import { isSampleTravelUpdate } from "@/lib/travel-updates/sample-slugs";
import { listPublishedTravelUpdates, getPublishedTravelUpdateBySlug } from "@/services/travel-update-service";

export type PublicTravelUpdate = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string | null;
  updatedAt: string | null;
  source: string | null;
  review: string | null;
  body: string;
  sample: boolean;
};

const dbCategory: Record<string, string> = {
  FLIGHT: "Flights",
  ROAD: "Roads",
  WEATHER: "Weather",
  TOURISM: "Tourism",
  ADVISORY: "Advisory",
};

function fromMarkdown(item: MarkdownTravelUpdate): PublicTravelUpdate {
  return {
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    category: item.category,
    publishedAt: item.publishedAt || null,
    updatedAt: item.updatedAt || item.publishedAt || null,
    source: item.source || null,
    review: item.review || null,
    body: item.body,
    sample: false,
  };
}

export async function listPublicTravelUpdates(input?: {
  category?: string;
  includeSamples?: boolean;
}): Promise<PublicTravelUpdate[]> {
  const markdown = listMarkdownTravelUpdates().map(fromMarkdown);
  const db = await listPublishedTravelUpdates();
  const fromDb: PublicTravelUpdate[] = db.map((item) => ({
    slug: item.slug,
    title: item.title,
    summary: item.summary ?? "",
    category: dbCategory[item.type] ?? item.type,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    updatedAt: item.updatedAt?.toISOString() ?? null,
    source: null,
    review: isSampleTravelUpdate(item.slug) ? "Sample CMS page" : null,
    body: item.body,
    sample: isSampleTravelUpdate(item.slug),
  }));

  const merged = [...markdown, ...fromDb].sort((a, b) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
  return merged.filter((item) => {
    if (!input?.includeSamples && item.sample) return false;
    if (input?.category && item.category.toLowerCase() !== input.category.toLowerCase()) return false;
    return true;
  });
}

export async function getPublicTravelUpdate(slug: string): Promise<PublicTravelUpdate | null> {
  const markdown = listMarkdownTravelUpdates().find((item) => item.slug === slug);
  if (markdown) return fromMarkdown(markdown);
  const row = await getPublishedTravelUpdateBySlug(slug);
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? "",
    category: dbCategory[row.type] ?? row.type,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    source: null,
    review: isSampleTravelUpdate(row.slug) ? "Sample CMS page" : null,
    body: row.body,
    sample: isSampleTravelUpdate(row.slug),
  };
}

export function latestPublicTravelUpdates(items: PublicTravelUpdate[], count = 3): PublicTravelUpdate[] {
  return items.filter((item) => !item.sample).slice(0, count);
}

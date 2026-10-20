import { readFileSync, readdirSync } from "fs";
import path from "path";

export const travelUpdateCategories = ["Flights", "Roads", "Weather", "Umrah", "Visas"] as const;
export type TravelUpdateCategory = (typeof travelUpdateCategories)[number];

export type MarkdownTravelUpdate = {
  slug: string;
  title: string;
  summary: string;
  category: TravelUpdateCategory;
  publishedAt: string;
  updatedAt: string;
  source: string;
  /** Owner flag. These notes are general and must be checked before they are treated as current. */
  review: string;
  body: string;
};

const directory = path.join(process.cwd(), "content", "travel-updates");

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw.trim() };
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const split = line.indexOf(":");
    if (split === -1) continue;
    const key = line.slice(0, split).trim();
    const value = line.slice(split + 1).trim().replace(/^["']|["']$/g, "");
    if (key) meta[key] = value;
  }
  return { meta, body: match[2]!.trim() };
}

function isCategory(value: string): value is TravelUpdateCategory {
  return (travelUpdateCategories as readonly string[]).includes(value);
}

export function listMarkdownTravelUpdates(): MarkdownTravelUpdate[] {
  let files: string[] = [];
  try {
    files = readdirSync(directory).filter((name) => name.endsWith(".md"));
  } catch {
    return [];
  }

  const items: MarkdownTravelUpdate[] = [];
  for (const file of files) {
    const raw = readFileSync(path.join(directory, file), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const category = meta.category ?? "";
    if (!meta.slug || !meta.title || !isCategory(category)) continue;
    items.push({
      slug: meta.slug,
      title: meta.title,
      summary: meta.summary ?? "",
      category,
      publishedAt: meta.publishedAt ?? "",
      updatedAt: meta.updatedAt || meta.publishedAt || "",
      source: meta.source ?? "",
      review: meta.review ?? "TODO: verify",
      body,
    });
  }

  return items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getMarkdownTravelUpdate(slug: string): MarkdownTravelUpdate | null {
  return listMarkdownTravelUpdates().find((item) => item.slug === slug) ?? null;
}

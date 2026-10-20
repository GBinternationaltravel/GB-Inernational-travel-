import { siteConfig } from "@/config/site";
import { listPublicTravelUpdates } from "@/lib/travel-updates/public-feed";

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET() {
  const items = (await listPublicTravelUpdates({ includeSamples: false })).slice(0, 20);
  const base = siteConfig.url.replace(/\/$/, "");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteConfig.name)} travel updates</title>
    <link>${base}/travel-updates</link>
    <description>Flight, road, weather, Umrah and visa notes. Not live operational reports.</description>
    ${items
      .map((item) => {
        const link = `${base}/travel-updates/${item.slug}`;
        return `<item>
      <title>${escapeXml(item.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${item.publishedAt ? new Date(item.publishedAt).toUTCString() : ""}</pubDate>
      <category>${escapeXml(item.category)}</category>
      <description>${escapeXml(item.summary)}</description>
    </item>`;
      })
      .join("\n")}
  </channel>
</rss>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { listAllDestinationPaths } from "@/data/destinations/catalog";
import { flightRoutePages } from "@/data/flight-routes";
import { isSampleTravelUpdate } from "@/lib/travel-updates/sample-slugs";
import { listPublicTravelUpdates } from "@/lib/travel-updates/public-feed";
import { listPublishedTours } from "@/services/tour-service";
import { listPublishedVisaGuides } from "@/services/visa-guide-service";

const staticRoutes = [
  "/",
  "/flights",
  "/flights/domestic",
  "/flights/international",
  "/destinations",
  "/travel-guides",
  "/travel-updates",
  "/tours",
  "/visa",
  "/deals",
  "/flight-status",
  "/airports",
  "/airlines",
  "/about",
  "/contact",
  "/faq",
  "/privacy-policy",
  "/terms",
  "/refund-policy",
  "/cancellation-policy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date();
  const destinationRoutes = listAllDestinationPaths().filter(
    (path) => path !== "/destinations",
  );
  const routeGuides = flightRoutePages.map((route) => `/flights/${route.slug}`);

  const [tours, visas, updates] = await Promise.all([
    listPublishedTours().catch(() => []),
    listPublishedVisaGuides().catch(() => []),
    listPublicTravelUpdates({ includeSamples: false }).catch(() => []),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  for (const route of [...staticRoutes, ...destinationRoutes, ...routeGuides]) {
    entries.push({
      url: `${siteConfig.url}${route}`,
      lastModified: generatedAt,
      changeFrequency: route === "/" || route === "/flights" ? "weekly" : "monthly",
      priority: route === "/" ? 1 : route === "/flights" ? 0.9 : 0.7,
    });
  }

  for (const tour of tours) {
    entries.push({
      url: `${siteConfig.url}/tours/${tour.slug}`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }
  for (const visa of visas) {
    entries.push({
      url: `${siteConfig.url}/visa/${visa.slug}`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }
  for (const update of updates) {
    if (isSampleTravelUpdate(update.slug)) continue;
    const dated = update.updatedAt || update.publishedAt;
    entries.push({
      url: `${siteConfig.url}/travel-updates/${update.slug}`,
      lastModified: dated ? new Date(dated) : generatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}

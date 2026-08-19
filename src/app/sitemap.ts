import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { listAllDestinationPaths } from "@/data/destinations/catalog";
import { listPublishedTours } from "@/services/tour-service";
import { listPublishedTravelUpdates } from "@/services/travel-update-service";
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
  const lastModified = new Date();
  const destinationRoutes = listAllDestinationPaths().filter(
    (path) => path !== "/destinations",
  );

  const [tours, visas, updates] = await Promise.all([
    listPublishedTours().catch(() => []),
    listPublishedVisaGuides().catch(() => []),
    listPublishedTravelUpdates().catch(() => []),
  ]);

  const dynamicRoutes = [
    ...tours.map((t) => `/tours/${t.slug}`),
    ...visas.map((v) => `/visa/${v.slug}`),
    ...updates.map((u) => `/travel-updates/${u.slug}`),
  ];

  const routes = [...staticRoutes, ...destinationRoutes, ...dynamicRoutes];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified,
    changeFrequency:
      route === "/" ||
      route === "/flights" ||
      route.startsWith("/destinations") ||
      route.startsWith("/travel-updates")
        ? "weekly"
        : "monthly",
    priority:
      route === "/"
        ? 1
        : route.startsWith("/destinations/") ||
            route.startsWith("/tours/") ||
            route.startsWith("/visa/")
          ? 0.8
          : route === "/flights"
            ? 0.9
            : 0.7,
  }));
}

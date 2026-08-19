import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/my-trips",
        "/account",
        "/login",
        "/register",
        "/forgot-password",
        "/api/",
        "/flights/results",
        "/booking/",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}

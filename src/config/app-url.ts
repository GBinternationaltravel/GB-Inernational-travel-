/**
 * Public site URL for canonical, sitemap, robots, Open Graph, and JSON-LD.
 * Prefer NEXT_PUBLIC_APP_URL. Production builds fall back to the official domain
 * so a missing env var cannot publish localhost or a Vercel preview host as canonical.
 */
export const OFFICIAL_PRODUCTION_URL = "https://www.gbinternationaltravels.com";

export function getPublicAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return OFFICIAL_PRODUCTION_URL;
  }

  return "http://localhost:3000";
}

/** Seeded CMS samples. Keep the URLs. Do not index them. */
export const SAMPLE_TRAVEL_UPDATE_SLUGS = [
  "kkh-seasonal-advisory",
  "gilgit-weather-update-sample",
  "skardu-flight-ops-sample",
] as const;

export function isSampleTravelUpdate(slug: string): boolean {
  return (SAMPLE_TRAVEL_UPDATE_SLUGS as readonly string[]).includes(slug);
}

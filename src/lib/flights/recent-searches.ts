import type { SearchFormValues } from "@/lib/flights/search-params";
import { buildResultsHref } from "@/lib/flights/search-params";

const STORAGE_KEY = "gb_recent_flight_searches_v1";

export type RecentSearch = {
  label: string;
  href: string;
};

export function readRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentSearch =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as RecentSearch).label === "string" &&
          typeof (item as RecentSearch).href === "string",
      )
      .slice(0, 5);
  } catch {
    return [];
  }
}

export function rememberRecentSearch(values: SearchFormValues): void {
  if (typeof window === "undefined") return;
  const label = `${values.origin} → ${values.destination}`;
  const href = buildResultsHref(values);
  const next = [{ label, href }, ...readRecentSearches().filter((item) => item.href !== href)].slice(
    0,
    5,
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full disk should not block the search.
  }
}

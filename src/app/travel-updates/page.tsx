import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { listPublishedTravelUpdates } from "@/services/travel-update-service";

export const metadata: Metadata = buildMetadata({
  title: "Gilgit-Baltistan Travel Updates",
  description:
    "Flight, road, weather, tourism, and advisory updates for Gilgit-Baltistan travel.",
  path: "/travel-updates",
});

type Props = {
  searchParams: Promise<{ type?: string; region?: string }>;
};

const typeLabels: Record<string, string> = {
  FLIGHT: "Flight Updates",
  ROAD: "Road Updates",
  WEATHER: "Weather",
  TOURISM: "Tourism",
  ADVISORY: "Travel Alerts",
};

function priorityBadge(priority: string) {
  if (priority === "URGENT") return <Badge variant="error">URGENT</Badge>;
  if (priority === "HIGH" || priority === "IMPORTANT")
    return <Badge variant="warning">IMPORTANT</Badge>;
  return <Badge variant="default">NORMAL</Badge>;
}

export default async function TravelUpdatesPage({ searchParams }: Props) {
  const params = await searchParams;
  const items = await listPublishedTravelUpdates({
    type: params.type,
    region: params.region,
  });

  return (
    <>
      <PageHero
        title="Gilgit-Baltistan Travel Updates"
        description="Flight, road, weather and tourism notices for safer travel planning."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Travel Updates" },
        ]}
      />

      <Section>
        <form className="mb-6 flex flex-wrap gap-3">
          <select
            name="type"
            defaultValue={params.type ?? ""}
            className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-sm"
          >
            <option value="">All categories</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            name="region"
            defaultValue={params.region ?? ""}
            placeholder="Region (e.g. Hunza)"
            className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-sm"
          />
          <button
            type="submit"
            className="h-10 rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-4 text-sm font-semibold text-white"
          >
            Filter
          </button>
        </form>

        {items.length === 0 ? (
          <Alert variant="info" title="No published updates">
            There are no active travel updates matching this filter right now.
          </Alert>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const urgent = item.priority === "URGENT" || item.priority === "HIGH";
              return (
                <li
                  key={item.id}
                  className={`rounded-[var(--radius-lg)] border bg-white p-5 shadow-[var(--shadow-card)] ${
                    urgent
                      ? "border-[color-mix(in_srgb,var(--color-warning)_45%,var(--color-border))] border-l-4 border-l-[var(--color-warning)]"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="info">{typeLabels[item.type] ?? item.type}</Badge>
                        {priorityBadge(item.priority)}
                        {item.region ? (
                          <span className="text-xs text-[var(--color-muted)]">{item.region}</span>
                        ) : null}
                      </div>
                      <h2 className="mt-2 text-xl font-semibold text-[var(--color-navy)]">
                        <Link
                          href={`/travel-updates/${item.slug}`}
                          className="hover:text-[var(--color-emerald)]"
                        >
                          {item.title}
                        </Link>
                      </h2>
                    </div>
                    {item.publishedAt ? (
                      <time className="text-xs text-[var(--color-muted)]">
                        {new Date(item.publishedAt).toLocaleDateString()}
                      </time>
                    ) : null}
                  </div>
                  {item.summary ? (
                    <p className="mt-2 text-sm text-[var(--color-muted)]">{item.summary}</p>
                  ) : null}
                  <Link
                    href={`/travel-updates/${item.slug}`}
                    className="mt-3 inline-flex text-sm font-semibold text-[var(--color-sky)]"
                  >
                    Read update
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}

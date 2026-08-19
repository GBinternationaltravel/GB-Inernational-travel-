import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";
import { FlightStatusLookupForm } from "@/features/flight-status/flight-status-lookup-form";
import { lookupFlightStatus } from "@/services/flight-status-service";

export const metadata: Metadata = buildMetadata({
  title: "Flight Status",
  description:
    "Look up flight status when a licensed status provider is connected. Live gates and delays are never invented.",
  path: "/flight-status",
});

type Props = {
  searchParams: Promise<{ flight?: string; airline?: string; date?: string }>;
};

export default async function FlightStatusPage({ searchParams }: Props) {
  const params = await searchParams;
  const flight = params.flight?.trim().toUpperCase();
  const result = flight
    ? await lookupFlightStatus({
        flightNumber: flight,
        date: params.date,
      })
    : null;

  return (
    <>
      <PageHero
        title="Flight Status"
        description="Enter an airline and flight number. Live operational status requires a connected status provider."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Flight Status" },
        ]}
      />

      <Section>
        <Suspense fallback={<p className="text-sm text-[var(--color-muted)]">Loading form…</p>}>
          <FlightStatusLookupForm />
        </Suspense>

        <div className="mt-8">
          {!flight ? (
            <Alert variant="info" title="Status provider not connected for live data">
              You can prepare a lookup now. GB International Travel will not invent boarding
              gates, delays, or live departure times until a licensed flight-status API is
              connected.
            </Alert>
          ) : result ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl">{result.flightNumber}</h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {result.origin} → {result.destination}
                  </p>
                </div>
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950">
                  {result.dataLabel}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--color-muted)]">Status</dt>
                  <dd className="font-medium">{result.statusLabel}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Code</dt>
                  <dd className="font-medium">{result.status}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-muted)]">Provider</dt>
                  <dd className="font-medium">{result.providerCode}</dd>
                </div>
                {result.delayMinutes != null ? (
                  <div>
                    <dt className="text-[var(--color-muted)]">Delay (sample)</dt>
                    <dd className="font-medium">{result.delayMinutes} min</dd>
                  </div>
                ) : null}
                {params.date ? (
                  <div>
                    <dt className="text-[var(--color-muted)]">Requested date</dt>
                    <dd className="font-medium">{params.date}</dd>
                  </div>
                ) : null}
              </dl>

              <Alert
                variant={result.isMock ? "warning" : "info"}
                className="mt-4"
                title={result.isMock ? "MOCK — not live airline status" : "Live status"}
              >
                {result.notice}
              </Alert>

              <p className="mt-4 text-sm text-[var(--color-muted)]">
                Prefer booking-linked status? Open{" "}
                <Link href="/my-trips" className="text-[var(--color-brand)]">
                  My Trips
                </Link>{" "}
                after signing in.
              </p>
            </div>
          ) : (
            <Alert variant="warning" title="No status available">
              Could not prepare a status snapshot for this flight number. Live status remains
              unavailable until a provider is connected.
            </Alert>
          )}
        </div>
      </Section>
    </>
  );
}

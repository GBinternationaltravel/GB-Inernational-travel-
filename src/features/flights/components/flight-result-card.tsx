"use client";

import { Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FlightOffer } from "@/types/flight";
import { calculateOfferPriceSnapshot } from "@/lib/booking/pricing";
import {
  formatDuration,
  formatFlightTime,
  formatPrice,
  formatBaggageLabel,
  stopsLabel,
} from "@/lib/flights/filter-sort";

export function FlightResultCard({
  offer,
  onSelect,
  selecting = false,
}: {
  offer: FlightOffer;
  onSelect: (offer: FlightOffer) => void;
  selecting?: boolean;
}) {
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];
  if (!first || !last) return null;

  const airline = first.airline;
  const pricing = calculateOfferPriceSnapshot(offer);
  const ratePct = (pricing.markupRate * 100).toFixed(pricing.markupRate === 0.035 ? 1 : 0);

  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-navy)] text-xs font-bold text-white"
            aria-hidden="true"
          >
            {airline.iataCode}
          </div>
          <div>
            <p className="font-semibold text-[var(--color-navy)]">{airline.name}</p>
            <p className="text-sm text-[var(--color-muted)]">
              {first.flightNumber}
              {offer.cabinClass ? ` · ${offer.cabinClass.replaceAll("_", " ")}` : null}
            </p>
          </div>
        </div>
        <Badge variant={offer.isMock ? "warning" : "info"}>
          {offer.isMock
            ? "Mock inventory"
            : "Live pre-production — not a confirmed ticket"}
        </Badge>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <div>
          <p className="text-2xl font-bold tracking-tight text-[var(--color-navy)]">
            {formatFlightTime(first.departureAt)}
          </p>
          <p className="text-sm font-semibold text-[var(--color-sky)]">{first.origin.iataCode}</p>
          <p className="text-xs text-[var(--color-muted)]">{first.origin.city}</p>
        </div>

        <div className="flex flex-col items-center text-center">
          <p className="text-xs text-[var(--color-muted)]">
            {formatDuration(offer.durationMinutes)}
          </p>
          <div className="my-1 flex w-full min-w-20 items-center gap-1">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            <Plane className="h-3.5 w-3.5 text-[var(--color-emerald)]" />
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <p className="text-xs font-semibold text-[var(--color-ink)]">{stopsLabel(offer.stops)}</p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight text-[var(--color-navy)]">
            {formatFlightTime(last.arrivalAt)}
          </p>
          <p className="text-sm font-semibold text-[var(--color-sky)]">
            {last.destination.iataCode}
          </p>
          <p className="text-xs text-[var(--color-muted)]">{last.destination.city}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-[var(--color-border)] pt-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-muted)]">
            <span>{formatBaggageLabel(offer)}</span>
            {offer.fareFamily ? <span>{offer.fareFamily}</span> : null}
            <span>{offer.refundable ? "Refundable" : "Non-refundable"}</span>
          </div>
          <dl className="mt-3 grid max-w-md gap-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-muted)]">Base fare</dt>
              <dd className="font-medium tabular-nums">
                {formatPrice(pricing.baseFare, pricing.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-muted)]">Taxes</dt>
              <dd className="font-medium tabular-nums">
                {formatPrice(pricing.taxes, pricing.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-muted)]">
                GB service fee ({ratePct}%)
              </dt>
              <dd className="font-medium tabular-nums">
                {formatPrice(pricing.fees, pricing.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--color-border)] pt-1.5">
              <dt className="font-semibold text-[var(--color-navy)]">Total</dt>
              <dd className="font-bold tabular-nums text-[var(--color-navy)]">
                {formatPrice(pricing.total, pricing.currency)}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-4 lg:flex-col lg:items-end">
          <p className="text-2xl font-bold tracking-tight text-[var(--color-emerald)] lg:text-3xl">
            {formatPrice(pricing.total, pricing.currency)}
          </p>
          <Button
            size="lg"
            className="min-w-36"
            onClick={() => onSelect(offer)}
            isLoading={selecting}
          >
            Select Flight
          </Button>
        </div>
      </div>
    </article>
  );
}

export function FlightResultCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)]" />
        <div className="space-y-2">
          <div className="h-4 w-40 rounded bg-[var(--color-surface-muted)]" />
          <div className="h-3 w-24 rounded bg-[var(--color-surface-muted)]" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="h-12 rounded bg-[var(--color-surface-muted)]" />
        <div className="h-12 rounded bg-[var(--color-surface-muted)]" />
        <div className="h-12 rounded bg-[var(--color-surface-muted)]" />
      </div>
      <div className="mt-5 h-12 rounded bg-[var(--color-surface-muted)]" />
    </div>
  );
}

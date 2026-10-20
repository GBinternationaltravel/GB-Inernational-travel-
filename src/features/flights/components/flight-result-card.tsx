"use client";

import { Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FlightOffer } from "@/types/flight";
import { calculateOfferPriceSnapshot } from "@/lib/booking/pricing";
import { CUSTOMER_FARE_LABEL } from "@/lib/booking/customer-price";
import {
  formatDuration,
  formatFlightDate,
  formatFlightTime,
  formatPrice,
  formatBaggageLabel,
  stopsLabel,
} from "@/lib/flights/filter-sort";
import { formatFlightNumber } from "@/lib/flights/flight-number";

export function FlightResultCard({
  offer,
  onSelect,
  selecting = false,
  selectLabel = "Select Flight",
  priceMode = "trip",
}: {
  offer: FlightOffer;
  onSelect: (offer: FlightOffer) => void;
  selecting?: boolean;
  selectLabel?: string;
  /** Accepted for older callers. Every card shows the same published total. */
  priceMode?: "trip" | "leg";
}) {
  void priceMode;
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];
  if (!first || !last) return null;

  const airline = first.airline;
  // Customers see one published fare; the GB service fee is never shown separately.
  const pricing = calculateOfferPriceSnapshot(offer);
  const displayTotal = pricing.total;
  const baggageKnown = offer.baggageIncluded && offer.baggageKg > 0;

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
              {formatFlightNumber(first.flightNumber, first.airline.iataCode)}
              {offer.cabinClass ? ` · ${offer.cabinClass.replaceAll("_", " ")}` : null}
            </p>
          </div>
        </div>
        <Badge variant={offer.isMock ? "warning" : "info"}>
          {offer.isMock
            ? "Not a published fare"
            : offer.supplierCode === "INVENTORY"
              ? typeof offer.seatsRemaining === "number" && offer.seatsRemaining <= 5
                ? `Up to ${offer.seatsRemaining} ${offer.seatsRemaining === 1 ? "seat" : "seats"} listed — confirm with us`
                : "Listed in our inventory"
              : "Ask us to confirm this fare"}
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
            {baggageKnown ? <span>{formatBaggageLabel(offer)}</span> : null}
            {offer.fareFamily ? <span>{offer.fareFamily}</span> : null}
            <span>{offer.refundable ? "Refundable" : "Non-refundable"}</span>
          </div>
          {offer.fareUpdatedAt ? (
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              Fare last updated {formatFlightDate(offer.fareUpdatedAt)}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-4 lg:flex-col lg:items-end">
          <p className="text-2xl font-bold tracking-tight text-[var(--color-emerald)] lg:text-3xl">
            {formatPrice(displayTotal, pricing.currency)}
          </p>
          <p className="text-xs text-[var(--color-muted)]">{CUSTOMER_FARE_LABEL}</p>
          <Button
            size="lg"
            className="min-w-36"
            onClick={() => onSelect(offer)}
            isLoading={selecting}
          >
            {selectLabel}
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

"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, Filter, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { FlightSearchWidget } from "@/features/flights/components/flight-search-widget";
import { FlightFiltersPanel } from "@/features/flights/components/flight-filters-panel";
import {
  FlightResultCard,
  FlightResultCardSkeleton,
} from "@/features/flights/components/flight-result-card";
import { getAirportByCode } from "@/data/airports";
import {
  defaultFlightFilters,
  filterOffers,
  formatFlightDate,
  sortOffers,
} from "@/lib/flights/filter-sort";
import { saveSelectedFlight } from "@/lib/flights/selection";
import type { SearchFormValues } from "@/lib/flights/search-params";
import type { FlightFiltersState, FlightOffer, FlightSortOption } from "@/types/flight";
import { cabinClasses } from "@/config/booking";

const sortOptions: Array<{ value: FlightSortOption; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "cheapest", label: "Cheapest" },
  { value: "fastest", label: "Fastest" },
  { value: "earliest_departure", label: "Earliest Departure" },
  { value: "latest_arrival", label: "Latest Arrival" },
];

export function FlightResultsExperience({
  search,
  initialOffers,
  loadError = false,
  errorMessage,
  isMock = true,
  supplierCode = "MOCK",
  supplierEnvironment = null,
}: {
  search: SearchFormValues;
  initialOffers: FlightOffer[];
  loadError?: boolean;
  errorMessage?: string | null;
  isMock?: boolean;
  supplierCode?: string;
  supplierEnvironment?: string | null;
}) {
  const router = useRouter();
  const [offers] = useState(initialOffers);
  const [filters, setFilters] = useState<FlightFiltersState>(defaultFlightFilters());
  const [sort, setSort] = useState<FlightSortOption>("recommended");
  const [modifyOpen, setModifyOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 300);
    return () => window.clearTimeout(timer);
  }, []);

  const origin = getAirportByCode(search.origin);
  const destination = getAirportByCode(search.destination);

  const visibleOffers = useMemo(
    () => sortOffers(filterOffers(offers, filters), sort),
    [offers, filters, sort],
  );

  const passengerLabel = buildPassengerLabel(search);
  const cabinLabel =
    cabinClasses.find((item) => item.value === search.cabinClass)?.label ?? search.cabinClass;

  function clearFilters() {
    setFilters(defaultFlightFilters());
  }

  function shiftDeparture(days: number) {
    if (!search.departureDate) return;
    const next = shiftDate(search.departureDate, days);
    const params = new URLSearchParams(window.location.search);
    params.set("departure", next);
    if (search.returnDate) {
      const returnNext =
        search.returnDate < next ? shiftDate(next, 2) : search.returnDate;
      params.set("return", returnNext);
    }
    startTransition(() => {
      router.push(`/flights/results?${params.toString()}`);
    });
  }

  function onSelect(offer: FlightOffer) {
    setSelectingId(offer.id);
    saveSelectedFlight({
      offer,
      search: {
        tripType: search.tripType,
        origin: search.origin,
        destination: search.destination,
        departureDate: search.departureDate,
        returnDate: search.returnDate || undefined,
        adults: search.adults,
        children: search.children,
        infants: search.infants,
        cabinClass: search.cabinClass,
      },
      selectedAt: new Date().toISOString(),
    });
    router.push("/booking/passengers");
  }

  if (loadError) {
    return (
      <ErrorState
        title="We couldn't load flights right now. Please try again."
        description={
          errorMessage ??
          "Something went wrong while loading flight results. No raw supplier details are shown."
        }
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={() => window.location.reload()}>
              Try Again
            </Button>
            <Button type="button" variant="outline" onClick={() => setModifyOpen(true)}>
              Modify Search
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="pb-24 lg:pb-10">
      <div className="sticky top-16 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex flex-wrap items-center gap-2 font-display text-xl text-[var(--color-ink)] sm:text-2xl">
                <span>
                  {origin?.city ?? search.origin} ({search.origin})
                </span>
                <ArrowRight className="h-4 w-4" />
                <span>
                  {destination?.city ?? search.destination} ({search.destination})
                </span>
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {formatFlightDate(search.departureDate)}
                {search.returnDate ? ` · Return ${formatFlightDate(search.returnDate)}` : ""}
                {" · "}
                {passengerLabel} · {cabinLabel}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => setModifyOpen(true)}>
              Modify Search
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Previous day"
                onClick={() => shiftDeparture(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">{formatFlightDate(search.departureDate)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Next day"
                onClick={() => shiftDeparture(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 lg:hidden">
              <Button type="button" variant="outline" size="sm" onClick={() => setFiltersOpen(true)}>
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSortOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" />
                Sort
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-40 rounded-xl border border-[var(--color-border)] bg-white p-4">
            <FlightFiltersPanel
              filters={filters}
              offers={offers}
              onChange={setFilters}
              onClear={clearFilters}
            />
          </div>
        </aside>

        <div>
          <Alert variant="warning" className="mb-4">
            {isMock
              ? "Showing mock development inventory only. These are not live airline fares or seats."
              : `Live pre-production supplier data (${supplierCode}${
                  supplierEnvironment ? ` · ${supplierEnvironment}` : ""
                }). These are not confirmed flights or issued tickets.`}
          </Alert>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-muted)]">
              <span className="font-medium text-[var(--color-ink)]">{visibleOffers.length}</span>{" "}
              flights found
              {!isMock && visibleOffers.length === 0
                ? " — no availability for this search right now"
                : ""}
            </p>
            <div className="hidden min-w-56 lg:block">
              <Select
                label="Sort"
                options={sortOptions}
                value={sort}
                onChange={(event) => setSort(event.target.value as FlightSortOption)}
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <FlightResultCardSkeleton />
              <FlightResultCardSkeleton />
              <FlightResultCardSkeleton />
            </div>
          ) : visibleOffers.length === 0 ? (
            <EmptyState
              title={
                isMock
                  ? "No flights match your filters."
                  : "No flights are available for this search right now."
              }
              description={
                isMock
                  ? "Try clearing filters or changing your search dates and airports."
                  : "The supplier returned no availability. Try different dates or airports."
              }
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Button type="button" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setModifyOpen(true)}>
                    Modify Search
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="space-y-4">
              {visibleOffers.map((offer) => (
                <FlightResultCard
                  key={offer.id}
                  offer={offer}
                  onSelect={onSelect}
                  selecting={selectingId === offer.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={modifyOpen}
        onClose={() => setModifyOpen(false)}
        title="Modify search"
      >
        <FlightSearchWidget
          key={`${search.origin}-${search.destination}-${search.departureDate}`}
          initialValues={search}
          compact
          onSearchComplete={() => setModifyOpen(false)}
        />
      </Drawer>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <FlightFiltersPanel
          filters={filters}
          offers={offers}
          onChange={setFilters}
          onClear={() => {
            clearFilters();
          }}
        />
        <Button type="button" className="mt-4 w-full" onClick={() => setFiltersOpen(false)}>
          Show {visibleOffers.length} flights
        </Button>
      </Drawer>

      <Drawer open={sortOpen} onClose={() => setSortOpen(false)} title="Sort flights">
        <div className="space-y-2">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`flex w-full rounded-md px-3 py-3 text-left text-sm ${
                sort === option.value
                  ? "bg-[var(--color-surface-muted)] font-medium"
                  : "hover:bg-[var(--color-surface-muted)]"
              }`}
              onClick={() => {
                setSort(option.value);
                setSortOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Drawer>
    </div>
  );
}

function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close dialog overlay"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">{title}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function buildPassengerLabel(search: SearchFormValues): string {
  const parts: string[] = [];
  parts.push(`${search.adults} Adult${search.adults === 1 ? "" : "s"}`);
  if (search.children > 0) {
    parts.push(`${search.children} Child${search.children === 1 ? "" : "ren"}`);
  }
  if (search.infants > 0) {
    parts.push(`${search.infants} Infant${search.infants === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

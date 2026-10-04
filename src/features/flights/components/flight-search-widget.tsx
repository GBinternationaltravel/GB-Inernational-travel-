"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, ChevronDown, Minus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { cabinClasses, tripTypes } from "@/config/booking";
import { AirportAutocomplete } from "@/features/flights/components/airport-autocomplete";
import {
  buildResultsHref,
  defaultSearchFormValues,
  type SearchFormValues,
} from "@/lib/flights/search-params";
import {
  flightSearchSchema,
  getFlightSearchFieldErrors,
} from "@/lib/validations/flight";
import { cn } from "@/lib/utils";

const tripTabs = tripTypes.map((item) => ({
  id: item.value,
  label: item.label,
}));

/** A popular route shortcut shown under the hero search (prefills From/To). */
export type PopularRoute = {
  origin: string;
  destination: string;
  /** Short label for the route, e.g. "Islamabad → Skardu". */
  label: string;
  /** Hero only: groups the chips under a Domestic / International toggle. */
  group?: "domestic" | "international";
};

const routeGroups = [
  { id: "domestic", label: "Domestic" },
  { id: "international", label: "International" },
] as const;

/** Event other homepage sections dispatch to prefill the hero search with a route. */
export const PREFILL_ROUTE_EVENT = "gb:prefill-route";

/**
 * Hero-only styling for one cell of the search bar (From, To, Departure, Return).
 * Scoped with arbitrary variants so the shared Input/DatePicker/Autocomplete stay unchanged elsewhere.
 */
const heroCellClasses = cn(
  "relative px-4 py-3 transition-colors sm:px-5 lg:py-3.5",
  "focus-within:bg-[#faf7f1] focus-within:shadow-[inset_0_-2px_0_#8b6e3e]",
  "has-[[aria-invalid=true]]:bg-[#fff7f6]",
  "[&_label]:text-[0.625rem] [&_label]:font-semibold [&_label]:uppercase [&_label]:tracking-[0.16em] [&_label]:text-[#6b7280]",
  "[&_input]:h-8 [&_input]:rounded-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-0 [&_input]:py-0 [&_input]:pl-0",
  "[&_input]:text-[0.9375rem] [&_input]:font-medium [&_input]:text-[var(--color-navy)] [&_input]:shadow-none",
  "[&_input:focus-visible]:ring-0 [&_input:disabled]:cursor-not-allowed [&_input:disabled]:bg-transparent [&_input:disabled]:text-[#a3abb8]",
  "[&_input::placeholder]:text-[#9aa3b2] [&_.lucide-map-pin]:hidden",
  "[&_[role=listbox]]:mt-3 [&_[role=listbox]]:min-w-[18rem] [&_[role=listbox]]:rounded-xl [&_[role=listbox]]:border-[#ebe5da] [&_[role=listbox]]:shadow-[0_24px_48px_-16px_rgb(11_31_58/0.3)]",
);

const smallCapsLabel =
  "text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-[#6b7280]";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function FlightSearchWidget({
  initialValues,
  compact = false,
  onSearchComplete,
  variant = "default",
  popularRoutes,
}: {
  initialValues?: Partial<SearchFormValues>;
  compact?: boolean;
  onSearchComplete?: () => void;
  /** "hero" renders the restyled homepage panel; behaviour and fields are identical. */
  variant?: "default" | "hero";
  /** Hero only: route shortcuts that prefill From/To. */
  popularRoutes?: readonly PopularRoute[];
}) {
  const router = useRouter();
  const hero = variant === "hero";
  const departureRef = useRef<HTMLInputElement>(null);
  const merged = useMemo(
    () => ({ ...defaultSearchFormValues(), ...initialValues }),
    [initialValues],
  );

  const [values, setValues] = useState<SearchFormValues>(merged);
  const [pickedRoute, setPickedRoute] = useState<string | null>(null);
  const [routeGroup, setRouteGroup] = useState<"domestic" | "international">("domestic");
  const [travellersOpen, setTravellersOpen] = useState(false);
  const travellersRef = useRef<HTMLDivElement>(null);
  const travellersButtonRef = useRef<HTMLButtonElement>(null);
  const travellersId = useId();
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SearchFormValues | "form", string>>
  >({});

  function update<K extends keyof SearchFormValues>(key: K, value: SearchFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  }

  function swapAirports() {
    setValues((current) => ({
      ...current,
      origin: current.destination,
      destination: current.origin,
    }));
    setFieldErrors((current) => ({
      ...current,
      origin: undefined,
      destination: undefined,
      form: undefined,
    }));
  }

  function applyRoute(route: PopularRoute) {
    setValues((current) => ({
      ...current,
      origin: route.origin,
      destination: route.destination,
    }));
    setFieldErrors((current) => ({
      ...current,
      origin: undefined,
      destination: undefined,
      form: undefined,
    }));
    departureRef.current?.focus();
  }

  // Hero only: other homepage sections can prefill From/To (e.g. "Popular routes").
  useEffect(() => {
    if (!hero) return;
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<{ origin?: string; destination?: string }>).detail;
      if (!detail?.origin || !detail?.destination) return;
      setPickedRoute(`${detail.origin}-${detail.destination}`);
      const match = popularRoutes?.find(
        (route) => route.origin === detail.origin && route.destination === detail.destination,
      );
      if (match?.group) setRouteGroup(match.group);
      setValues((current) => ({
        ...current,
        origin: detail.origin!,
        destination: detail.destination!,
      }));
      setFieldErrors((current) => ({
        ...current,
        origin: undefined,
        destination: undefined,
        form: undefined,
      }));
      window.setTimeout(() => departureRef.current?.focus({ preventScroll: true }), 60);
    }
    window.addEventListener(PREFILL_ROUTE_EVENT, onPrefill);
    return () => window.removeEventListener(PREFILL_ROUTE_EVENT, onPrefill);
  }, [hero, popularRoutes]);

  // Hero only: close the travellers popover on outside click.
  useEffect(() => {
    if (!travellersOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!travellersRef.current?.contains(event.target as Node)) setTravellersOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [travellersOpen]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = flightSearchSchema.safeParse({
      tripType: values.tripType,
      origin: values.origin,
      destination: values.destination,
      departureDate: values.departureDate,
      returnDate: values.returnDate || undefined,
      adults: values.adults,
      children: values.children,
      infants: values.infants,
      cabinClass: values.cabinClass,
      currency: "PKR",
    });

    if (!parsed.success) {
      const errors = getFlightSearchFieldErrors(parsed.error);
      setFieldErrors(errors);
      if (hero && (errors.adults || errors.children || errors.infants || errors.cabinClass)) {
        setTravellersOpen(true);
      }
      return;
    }

    if (values.tripType === "MULTI_CITY") {
      setFieldErrors({
        form: hero
          ? "Multi-city search online is coming soon. Please choose One Way or Round Trip, or message us on WhatsApp for a multi-city trip."
          : "Multi-city search will be available in a later phase. Please use One Way or Round Trip.",
      });
      return;
    }

    router.push(buildResultsHref(values));
    onSearchComplete?.();
  }

  const fromField = (
    <AirportAutocomplete
      label="From"
      name="from"
      value={values.origin}
      onChange={(code) => update("origin", code)}
      error={fieldErrors.origin}
    />
  );
  const toField = (
    <AirportAutocomplete
      label="To"
      name="to"
      value={values.destination}
      onChange={(code) => update("destination", code)}
      error={fieldErrors.destination}
    />
  );
  const departureField = (
    <DatePicker
      ref={departureRef}
      label="Departure"
      name="departure"
      value={values.departureDate}
      onChange={(event) => update("departureDate", event.target.value)}
      error={fieldErrors.departureDate}
    />
  );
  const returnField = (
    <DatePicker
      label="Return"
      name="return"
      value={values.returnDate}
      onChange={(event) => update("returnDate", event.target.value)}
      disabled={values.tripType === "ONE_WAY"}
      error={fieldErrors.returnDate}
      min={values.departureDate || undefined}
    />
  );
  const adultsField = (
    <Input
      label="Adults"
      name="adults"
      type="number"
      min={1}
      max={9}
      value={values.adults}
      onChange={(event) => update("adults", Number(event.target.value))}
      error={fieldErrors.adults}
    />
  );
  const cabinField = (
    <Select
      label="Cabin class"
      name="cabin"
      options={cabinClasses.map((item) => ({
        value: item.value,
        label: item.label,
      }))}
      value={values.cabinClass}
      onChange={(event) =>
        update("cabinClass", event.target.value as SearchFormValues["cabinClass"])
      }
      error={fieldErrors.cabinClass}
    />
  );
  const childrenField = (
    <Input
      label="Children"
      name="children"
      type="number"
      min={0}
      max={8}
      value={values.children}
      onChange={(event) => update("children", Number(event.target.value))}
      error={fieldErrors.children}
    />
  );
  const infantsField = (hint?: string) => (
    <Input
      label="Infants"
      name="infants"
      type="number"
      min={0}
      max={4}
      value={values.infants}
      onChange={(event) => update("infants", Number(event.target.value))}
      error={fieldErrors.infants}
      hint={hint}
    />
  );

  if (hero) {
    const cabinLabel =
      cabinClasses.find((item) => item.value === values.cabinClass)?.label ?? "Economy";
    const travellerSummary = [
      plural(values.adults, "Adult", "Adults"),
      values.children > 0 ? plural(values.children, "Child", "Children") : null,
      values.infants > 0 ? plural(values.infants, "Infant", "Infants") : null,
    ]
      .filter(Boolean)
      .join(", ");
    const travellerError =
      fieldErrors.adults || fieldErrors.children || fieldErrors.infants || fieldErrors.cabinClass;

    const stepper = (
      key: "adults" | "children" | "infants",
      label: string,
      min: number,
      max: number,
      field: React.ReactNode,
      hint?: string,
    ) => (
      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-medium text-[var(--color-navy)]" aria-hidden>
            {label}
          </p>
          {hint ? <p className="text-xs text-[var(--color-muted)]">{hint}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Fewer ${label.toLowerCase()}`}
            disabled={values[key] <= min}
            onClick={() => update(key, Math.max(min, values[key] - 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd5c6] text-[var(--color-navy)] transition-colors hover:border-[#8b6e3e] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden />
          </button>
          <div className="w-12 [&_input]:h-9 [&_input]:w-12 [&_input]:[appearance:textfield] [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-0 [&_input]:text-center [&_input]:text-[0.9375rem] [&_input]:font-semibold [&_input]:text-[var(--color-navy)] [&_input::-webkit-inner-spin-button]:appearance-none [&_input::-webkit-outer-spin-button]:appearance-none [&_label]:sr-only [&_p]:hidden">
            {field}
          </div>
          <button
            type="button"
            aria-label={`More ${label.toLowerCase()}`}
            disabled={values[key] >= max}
            onClick={() => update(key, Math.min(max, values[key] + 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd5c6] text-[var(--color-navy)] transition-colors hover:border-[#8b6e3e] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    );

    const grouped = Boolean(popularRoutes?.some((route) => route.group));
    const visibleRoutes = (popularRoutes ?? []).filter(
      (route) => !grouped || route.group === routeGroup,
    );
    const routeChips = (className: string) =>
      popularRoutes && popularRoutes.length > 0 ? (
        <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-3", className)}>
          {grouped ? (
            <div
              role="group"
              aria-label="Quick picks: domestic or international routes"
              className="inline-flex h-8 items-center rounded-full bg-[#f4efe6] p-0.5"
            >
              {routeGroups.map((group) => {
                const selected = routeGroup === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setRouteGroup(group.id)}
                    className={cn(
                      "h-7 rounded-full px-3.5 text-[0.625rem] font-semibold tracking-[0.16em] uppercase transition-colors",
                      selected
                        ? "bg-[var(--color-navy)] text-white shadow-[0_4px_10px_-4px_rgb(11_31_58/0.5)]"
                        : "text-[#6b5a3c] hover:text-[var(--color-navy)]",
                    )}
                  >
                    {group.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[0.625rem] font-semibold tracking-[0.18em] text-[#8b6e3e] uppercase">
              Popular
            </p>
          )}
          <ul className="flex flex-wrap gap-2" aria-label={grouped ? `${routeGroup === "domestic" ? "Domestic" : "International"} routes` : "Popular routes"}>
            {visibleRoutes.map((route) => {
              const key = `${route.origin}-${route.destination}`;
              const active =
                pickedRoute === key &&
                values.origin === route.origin &&
                values.destination === route.destination;
              return (
                <li key={key}>
                  <a
                    href={buildResultsHref({
                      ...values,
                      origin: route.origin,
                      destination: route.destination,
                    })}
                    onClick={(event) => {
                      event.preventDefault();
                      setPickedRoute(key);
                      applyRoute(route);
                    }}
                    aria-label={`${route.label} (${route.origin} to ${route.destination}): fill in From and To`}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "inline-flex h-8 items-center rounded-full border px-3.5 text-[0.8125rem] transition-colors",
                      active
                        ? "border-[#8b6e3e] bg-[#faf6ee] text-[var(--color-navy)]"
                        : "border-[#e7e1d6] text-[#4b5563] hover:border-[#b9a070] hover:text-[var(--color-navy)]",
                    )}
                  >
                    {route.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null;

    return (
      <div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Trip type" className="flex items-center gap-6">
            {tripTabs.map((tab) => {
              const selected = tab.id === values.tripType;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update("tripType", tab.id as SearchFormValues["tripType"])}
                  className={cn(
                    "relative py-1 text-[0.8125rem] tracking-[0.01em] whitespace-nowrap transition-colors",
                    selected
                      ? "font-semibold text-[var(--color-navy)]"
                      : "font-medium text-[#6b7280] hover:text-[var(--color-navy)]",
                  )}
                >
                  {tab.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-[#c9a96e] transition-opacity",
                      selected ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {fieldErrors.form ? (
          <Alert variant="error" className="mt-4">
            {fieldErrors.form}
          </Alert>
        ) : null}

        {values.tripType === "MULTI_CITY" && !fieldErrors.form ? (
          <Alert variant="warning" className="mt-4">
            Multi-city search online is coming soon. For a multi-city trip, message us on WhatsApp
            and our team will plan it with you.
          </Alert>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-stretch">
          <div className="grid flex-1 grid-cols-2 rounded-2xl border border-[#e4ddd0] bg-white lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_1.15fr]">
            <div
              className={cn(
                heroCellClasses,
                "z-20 col-span-2 rounded-t-2xl border-b border-[#ece6db] lg:col-span-1 lg:rounded-l-2xl lg:rounded-tr-none lg:border-r lg:border-b-0",
              )}
            >
              {fromField}
              <button
                type="button"
                onClick={swapAirports}
                aria-label="Swap From and To airports"
                title="Swap airports"
                className="absolute right-5 -bottom-4 z-10 inline-flex h-8 w-8 rotate-90 items-center justify-center rounded-full border border-[#e4ddd0] bg-white text-[var(--color-navy)] shadow-[0_2px_8px_rgb(11_31_58/0.08)] transition-colors hover:border-[#8b6e3e] hover:text-[#8b6e3e] lg:top-1/2 lg:-right-4 lg:bottom-auto lg:-translate-y-1/2 lg:rotate-0"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <div
              className={cn(
                heroCellClasses,
                "z-10 col-span-2 border-b border-[#ece6db] lg:col-span-1 lg:border-r lg:border-b-0 lg:pl-7",
              )}
            >
              {toField}
            </div>
            <div className={cn(heroCellClasses, "border-r border-b border-[#ece6db] lg:border-b-0")}>
              {departureField}
            </div>
            <div
              className={cn(heroCellClasses, "border-b border-[#ece6db] lg:border-r lg:border-b-0")}
            >
              {returnField}
            </div>
            <div
              ref={travellersRef}
              className={cn(
                "relative col-span-2 rounded-b-2xl px-4 py-3 transition-colors sm:px-5 lg:col-span-1 lg:rounded-r-2xl lg:rounded-bl-none lg:py-3.5",
                "focus-within:bg-[#faf7f1]",
                travellerError && "bg-[#fff7f6]",
              )}
              onKeyDown={(event) => {
                if (event.key === "Escape" && travellersOpen) {
                  setTravellersOpen(false);
                  travellersButtonRef.current?.focus();
                }
              }}
            >
              <p id={`${travellersId}-label`} className={smallCapsLabel}>
                Travellers &amp; cabin
              </p>
              <button
                ref={travellersButtonRef}
                id={`${travellersId}-button`}
                type="button"
                aria-expanded={travellersOpen}
                aria-controls={`${travellersId}-panel`}
                aria-labelledby={`${travellersId}-label ${travellersId}-button`}
                onClick={() => setTravellersOpen((open) => !open)}
                className="mt-1.5 flex h-8 w-full items-center justify-between gap-2 text-left text-[0.9375rem] font-medium text-[var(--color-navy)] focus-visible:outline-offset-4"
              >
                <span className="truncate">
                  {travellerSummary}
                  <span className="text-[#6b7280]"> · {cabinLabel}</span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-[#8b6e3e] transition-transform",
                    travellersOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {travellerError ? (
                <p className="mt-1 text-xs text-red-600">{travellerError}</p>
              ) : null}

              <div
                id={`${travellersId}-panel`}
                role="group"
                aria-label="Travellers and cabin class"
                hidden={!travellersOpen}
                className="absolute top-full right-0 z-40 mt-3 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-[#ebe5da] bg-white p-5 shadow-[0_30px_60px_-20px_rgb(11_31_58/0.35)]"
              >
                <div className="divide-y divide-[#f0ebe2]">
                  {stepper("adults", "Adults", 1, 9, adultsField)}
                  {stepper("children", "Children", 0, 8, childrenField)}
                  {stepper("infants", "Infants", 0, 4, infantsField(), "Infants cannot exceed adults")}
                </div>
                <div className="mt-3 [&_label]:text-[0.625rem] [&_label]:font-semibold [&_label]:tracking-[0.16em] [&_label]:text-[#6b7280] [&_label]:uppercase [&_select]:h-11 [&_select]:rounded-xl [&_select]:border-[#e4ddd0]">
                  {cabinField}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTravellersOpen(false);
                    travellersButtonRef.current?.focus();
                  }}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-[var(--color-navy)] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-navy-soft)]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-14 w-full rounded-2xl bg-[linear-gradient(180deg,#dcc08a,#bf9b5e)] px-7 text-[0.9375rem] font-semibold tracking-[0.01em] text-[#0b1f3a] shadow-[0_14px_30px_-12px_rgb(176_141_87/0.75)] hover:bg-[linear-gradient(180deg,#dfc58f,#c9a96e)] focus-visible:outline-[var(--color-navy)] lg:h-auto lg:w-auto lg:min-w-[11rem]"
          >
            <Search className="h-4.5 w-4.5" aria-hidden />
            Search flights
          </Button>
        </form>

        {routeChips("mt-4 lg:mt-5")}
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)]"
          : "rounded-[var(--radius-lg)] border border-white/20 bg-white p-4 shadow-[var(--shadow-elevated)] sm:p-6"
      }
    >
      <Tabs
        items={tripTabs}
        value={values.tripType}
        onChange={(id) => update("tripType", id as SearchFormValues["tripType"])}
        className="mb-4"
      />

      {!compact ? (
        <Alert variant="info" className="mb-4">
          Search uses mock development data only. Live airline inventory will be connected later.
        </Alert>
      ) : null}

      {fieldErrors.form ? (
        <Alert variant="error" className="mb-4">
          {fieldErrors.form}
        </Alert>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {fromField}
        {toField}
        {departureField}
        {returnField}
        {adultsField}
        {cabinField}

        {childrenField}
        {infantsField("Infants cannot exceed adults")}

        {values.tripType === "MULTI_CITY" ? (
          <div className="md:col-span-2 xl:col-span-6">
            <Alert variant="warning">
              Multi-city search UI is prepared. Full multi-city routing will be implemented later.
            </Alert>
          </div>
        ) : null}

        <div className="md:col-span-2 xl:col-span-6">
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            <Search className="h-4 w-4" />
            Search Flights
          </Button>
        </div>
      </form>
    </div>
  );
}

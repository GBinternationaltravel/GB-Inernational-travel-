"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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

const tripTabs = tripTypes.map((item) => ({
  id: item.value,
  label: item.label,
}));

export function FlightSearchWidget({
  initialValues,
  compact = false,
  onSearchComplete,
}: {
  initialValues?: Partial<SearchFormValues>;
  compact?: boolean;
  onSearchComplete?: () => void;
}) {
  const router = useRouter();
  const merged = useMemo(
    () => ({ ...defaultSearchFormValues(), ...initialValues }),
    [initialValues],
  );

  const [values, setValues] = useState<SearchFormValues>(merged);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SearchFormValues | "form", string>>
  >({});

  function update<K extends keyof SearchFormValues>(key: K, value: SearchFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  }

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
      setFieldErrors(getFlightSearchFieldErrors(parsed.error));
      return;
    }

    if (values.tripType === "MULTI_CITY") {
      setFieldErrors({
        form: "Multi-city search will be available in a later phase. Please use One Way or Round Trip.",
      });
      return;
    }

    router.push(buildResultsHref(values));
    onSearchComplete?.();
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
        <AirportAutocomplete
          label="From"
          name="from"
          value={values.origin}
          onChange={(code) => update("origin", code)}
          error={fieldErrors.origin}
        />
        <AirportAutocomplete
          label="To"
          name="to"
          value={values.destination}
          onChange={(code) => update("destination", code)}
          error={fieldErrors.destination}
        />
        <DatePicker
          label="Departure"
          name="departure"
          value={values.departureDate}
          onChange={(event) => update("departureDate", event.target.value)}
          error={fieldErrors.departureDate}
        />
        <DatePicker
          label="Return"
          name="return"
          value={values.returnDate}
          onChange={(event) => update("returnDate", event.target.value)}
          disabled={values.tripType === "ONE_WAY"}
          error={fieldErrors.returnDate}
          min={values.departureDate || undefined}
        />
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
        <Input
          label="Infants"
          name="infants"
          type="number"
          min={0}
          max={4}
          value={values.infants}
          onChange={(event) => update("infants", Number(event.target.value))}
          error={fieldErrors.infants}
          hint="Infants cannot exceed adults"
        />

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

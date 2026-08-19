"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FlightFiltersState, FlightOffer, StopsFilter, TimeOfDayBucket, DurationBucket } from "@/types/flight";
import { getAirlineById } from "@/data/airlines";

const stopOptions: Array<{ value: StopsFilter; label: string }> = [
  { value: "nonstop", label: "Nonstop" },
  { value: "one_stop", label: "1 Stop" },
  { value: "two_plus", label: "2+ Stops" },
];

const timeOptions: Array<{ value: TimeOfDayBucket; label: string }> = [
  { value: "early_morning", label: "Early morning" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

const durationOptions: Array<{ value: DurationBucket; label: string }> = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function FlightFiltersPanel({
  filters,
  offers,
  onChange,
  onClear,
}: {
  filters: FlightFiltersState;
  offers: FlightOffer[];
  onChange: (next: FlightFiltersState) => void;
  onClear: () => void;
}) {
  const airlineIds = Array.from(new Set(offers.map((offer) => offer.airlineId)));
  const priceFloor = offers.length ? Math.min(...offers.map((o) => o.totalPrice)) : 0;
  const priceCeil = offers.length ? Math.max(...offers.map((o) => o.totalPrice)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">Filters</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear All Filters
        </Button>
      </div>

      <FilterGroup title="Price (PKR)">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Min"
            type="number"
            min={priceFloor}
            max={priceCeil}
            value={filters.minPrice ?? ""}
            placeholder={String(priceFloor)}
            onChange={(event) =>
              onChange({
                ...filters,
                minPrice: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
          <Input
            label="Max"
            type="number"
            min={priceFloor}
            max={priceCeil}
            value={filters.maxPrice ?? ""}
            placeholder={String(priceCeil)}
            onChange={(event) =>
              onChange({
                ...filters,
                maxPrice: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
        </div>
      </FilterGroup>

      <FilterGroup title="Stops">
        <CheckboxList
          options={stopOptions}
          values={filters.stops}
          onToggle={(value) =>
            onChange({ ...filters, stops: toggleValue(filters.stops, value) })
          }
        />
      </FilterGroup>

      <FilterGroup title="Departure time">
        <CheckboxList
          options={timeOptions}
          values={filters.departureBuckets}
          onToggle={(value) =>
            onChange({
              ...filters,
              departureBuckets: toggleValue(filters.departureBuckets, value),
            })
          }
        />
      </FilterGroup>

      <FilterGroup title="Arrival time">
        <CheckboxList
          options={timeOptions}
          values={filters.arrivalBuckets}
          onToggle={(value) =>
            onChange({
              ...filters,
              arrivalBuckets: toggleValue(filters.arrivalBuckets, value),
            })
          }
        />
      </FilterGroup>

      <FilterGroup title="Duration">
        <CheckboxList
          options={durationOptions}
          values={filters.durationBuckets}
          onToggle={(value) =>
            onChange({
              ...filters,
              durationBuckets: toggleValue(filters.durationBuckets, value),
            })
          }
        />
      </FilterGroup>

      <FilterGroup title="Baggage">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.baggageIncludedOnly}
            onChange={(event) =>
              onChange({ ...filters, baggageIncludedOnly: event.target.checked })
            }
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          Baggage included
        </label>
      </FilterGroup>

      <FilterGroup title="Refundable">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.refundableOnly}
            onChange={(event) =>
              onChange({ ...filters, refundableOnly: event.target.checked })
            }
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          Refundable only
        </label>
      </FilterGroup>

      <FilterGroup title="Airlines">
        <div className="space-y-2">
          {airlineIds.map((id) => {
            const airline = getAirlineById(id);
            if (!airline) return null;
            return (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.airlines.includes(id)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      airlines: toggleValue(filters.airlines, id),
                    })
                  }
                  className="h-4 w-4 rounded border-[var(--color-border)]"
                />
                {airline.name}
              </label>
            );
          })}
        </div>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3 border-b border-[var(--color-border)] pb-5">
      <legend className="text-sm font-semibold text-[var(--color-ink)]">{title}</legend>
      {children}
    </fieldset>
  );
}

function CheckboxList<T extends string>({
  options,
  values,
  onToggle,
}: {
  options: Array<{ value: T; label: string }>;
  values: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.includes(option.value)}
            onChange={() => onToggle(option.value)}
            className="h-4 w-4 rounded border-[var(--color-border)]"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

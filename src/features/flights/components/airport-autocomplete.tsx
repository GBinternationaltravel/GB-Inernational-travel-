"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { searchAirports, getAirportByCode } from "@/data/airports";
import type { AirportSummary } from "@/types/flight";
import { cn } from "@/lib/utils";

export function AirportAutocomplete({
  label,
  name,
  value,
  onChange,
  error,
  placeholder = "City or airport",
  id: idProp,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (iataCode: string) => void;
  error?: string;
  placeholder?: string;
  id?: string;
}) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const selected = value ? getAirportByCode(value) : undefined;

  const [query, setQuery] = useState(
    selected ? `${selected.city} (${selected.iataCode})` : "",
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchAirports(query, 8), [query]);

  useEffect(() => {
    const airport = value ? getAirportByCode(value) : undefined;
    if (airport) {
      setQuery(`${airport.city} (${airport.iataCode})`);
    }
  }, [value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        const airport = value ? getAirportByCode(value) : undefined;
        setQuery(airport ? `${airport.city} (${airport.iataCode})` : "");
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [value]);

  function selectAirport(airport: AirportSummary) {
    onChange(airport.iataCode);
    setQuery(`${airport.city} (${airport.iataCode})`);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      const airport = results[activeIndex];
      if (airport) selectAirport(airport);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex w-full flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-ink)]">
        {label}
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          id={inputId}
          name={name}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results[activeIndex] ? `${listboxId}-${results[activeIndex].iataCode}` : undefined
          }
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
            if (value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "h-11 w-full rounded-md border border-[var(--color-border)] bg-white py-2 pr-3 pl-9 text-sm text-[var(--color-ink)]",
            "placeholder:text-[var(--color-muted)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]",
            error && "border-red-500",
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : null}

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute top-full z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-[var(--color-border)] bg-white py-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--color-muted)]">No airports found</li>
          ) : (
            results.map((airport, index) => {
              const active = index === activeIndex;
              return (
                <li
                  key={airport.iataCode}
                  id={`${listboxId}-${airport.iataCode}`}
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "cursor-pointer px-3 py-2",
                    active ? "bg-[var(--color-surface-muted)]" : "hover:bg-[var(--color-surface-muted)]",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectAirport(airport);
                  }}
                >
                  <p className="text-sm font-medium text-[var(--color-ink)]">{airport.city}</p>
                  <p className="text-xs text-[var(--color-muted)]">{airport.name}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {airport.iataCode} · {airport.country}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

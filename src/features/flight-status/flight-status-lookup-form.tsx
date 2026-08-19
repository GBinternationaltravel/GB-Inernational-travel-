"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const airlines = [
  { code: "", label: "Any / unknown" },
  { code: "PK", label: "Pakistan International (PK)" },
  { code: "EK", label: "Emirates (EK)" },
  { code: "EY", label: "Etihad (EY)" },
  { code: "QR", label: "Qatar Airways (QR)" },
  { code: "SV", label: "Saudia (SV)" },
  { code: "TK", label: "Turkish Airlines (TK)" },
  { code: "BA", label: "British Airways (BA)" },
];

export function FlightStatusLookupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [airline, setAirline] = useState(searchParams.get("airline") ?? "");
  const [flightNumber, setFlightNumber] = useState(
    searchParams.get("flight") ?? searchParams.get("flightNumber") ?? "",
  );
  const [date, setDate] = useState(searchParams.get("date") ?? "");

  const canSearch = useMemo(() => flightNumber.trim().length >= 2, [flightNumber]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSearch) return;

    const params = new URLSearchParams();
    const cleaned = flightNumber.trim().toUpperCase().replace(/\s+/g, "");
    const withAirline =
      airline && !cleaned.startsWith(airline) ? `${airline}${cleaned}` : cleaned;
    params.set("flight", withAirline);
    if (airline) params.set("airline", airline);
    if (date) params.set("date", date);
    router.push(`/flight-status?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm">
        <span className="mb-1 block text-[var(--color-muted)]">Airline</span>
        <select
          value={airline}
          onChange={(e) => setAirline(e.target.value)}
          className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        >
          {airlines.map((item) => (
            <option key={item.code || "any"} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-[var(--color-muted)]">Flight number</span>
        <Input
          value={flightNumber}
          onChange={(e) => setFlightNumber(e.target.value)}
          placeholder="e.g. PK309"
          required
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-[var(--color-muted)]">Date</span>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <div className="flex items-end">
        <Button type="submit" className="h-11 w-full" disabled={!canSearch}>
          Check status
        </Button>
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { FlightSearchWidget } from "@/features/flights/components/flight-search-widget";
import { cn } from "@/lib/utils";

/** Client island for home hero tabs + search only. */
export function HomeHeroSearch() {
  const [heroTab, setHeroTab] = useState<"flights" | "tours">("flights");

  return (
    <div className="mt-8">
      <div className="mb-3 inline-flex rounded-[var(--radius-md)] border border-white/15 bg-white/5 p-1">
        {(
          [
            { id: "flights" as const, label: "Flights" },
            { id: "tours" as const, label: "Tours" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setHeroTab(tab.id)}
            className={cn(
              "rounded-[calc(var(--radius-md)-2px)] px-4 py-2 text-sm font-semibold transition-colors",
              heroTab === tab.id
                ? "bg-white text-[var(--color-navy)]"
                : "text-white/75 hover:text-white",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {heroTab === "flights" ? (
        <FlightSearchWidget />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-white/15 bg-white p-6 text-[var(--color-ink)] shadow-[var(--shadow-elevated)] sm:p-8">
          <h2 className="text-xl font-semibold text-[var(--color-navy)]">
            Explore Gilgit-Baltistan
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--color-muted)]">
            Curated tours across Hunza, Skardu, Gilgit, Naltar, Khunjerab, Fairy Meadows and Deosai
            — with local expertise and clear pricing.
          </p>
          <div className="mt-6">
            <Link
              href="/tours"
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-emerald-dark)]"
            >
              View Tour Packages
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

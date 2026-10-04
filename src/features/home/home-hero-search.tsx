"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRight, Plane } from "lucide-react";
import {
  FlightSearchWidget,
  PREFILL_ROUTE_EVENT,
  type PopularRoute,
} from "@/features/flights/components/flight-search-widget";
import { homeDisplayFont } from "@/features/home/home-fonts";
import { HomeTravelDetails } from "@/features/home/home-travel-details";
import { whatsappHref } from "@/lib/contact-links";
import { cn } from "@/lib/utils";

type HeroTab = "flights" | "tours" | "visa";

const tabs: { id: HeroTab; label: string }[] = [
  { id: "flights", label: "Flights" },
  { id: "tours", label: "Tours" },
  { id: "visa", label: "Visa" },
];

/**
 * Quick-pick routes (prefill From/To in the existing form). Only routes with scheduled flights in
 * the live inventory (Admin → Flights): ISB⇄KDU, ISB⇄GIL, ISB⇄DXB, LHE⇄JED.
 */
const popularRoutes: readonly PopularRoute[] = [
  { origin: "ISB", destination: "KDU", label: "Islamabad → Skardu", group: "domestic" },
  { origin: "ISB", destination: "GIL", label: "Islamabad → Gilgit", group: "domestic" },
  { origin: "KDU", destination: "ISB", label: "Skardu → Islamabad", group: "domestic" },
  { origin: "GIL", destination: "ISB", label: "Gilgit → Islamabad", group: "domestic" },
  { origin: "ISB", destination: "DXB", label: "Islamabad → Dubai", group: "international" },
  { origin: "LHE", destination: "JED", label: "Lahore → Jeddah", group: "international" },
  { origin: "DXB", destination: "ISB", label: "Dubai → Islamabad", group: "international" },
  { origin: "JED", destination: "LHE", label: "Jeddah → Lahore", group: "international" },
];

/** Client island: Flights / Tours / Visa search panel that overlaps the home hero. */
export function HomeHeroSearch() {
  const [heroTab, setHeroTab] = useState<HeroTab>("flights");
  const baseId = useId();
  const tabRefs = useRef<Record<HeroTab, HTMLButtonElement | null>>({
    flights: null,
    tours: null,
    visa: null,
  });

  // A "Popular routes" click elsewhere on the page always lands on the Flights tab.
  useEffect(() => {
    const onPrefill = () => setHeroTab("flights");
    window.addEventListener(PREFILL_ROUTE_EVENT, onPrefill);
    return () => window.removeEventListener(PREFILL_ROUTE_EVENT, onPrefill);
  }, []);

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const id = tabs[next]!.id;
    setHeroTab(id);
    tabRefs.current[id]?.focus();
  }

  return (
    <div id="search" className="scroll-mt-24">
      <div
        role="tablist"
        aria-label="What would you like to book?"
        className="flex h-11 items-end gap-6 pl-1 sm:gap-8"
      >
        {tabs.map((tab, index) => {
          const selected = heroTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setHeroTab(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={cn(
                "relative inline-flex items-center gap-2 py-2 font-semibold uppercase transition-colors",
                tab.id === "flights"
                  ? "text-[0.8125rem] tracking-[0.24em]"
                  : "text-[0.6875rem] tracking-[0.22em]",
                selected ? "text-white" : "text-white/60 hover:text-white",
              )}
            >
              {tab.id === "flights" ? (
                <Plane className="h-3.5 w-3.5 text-[#e6d1a6]" strokeWidth={1.6} aria-hidden />
              ) : null}
              {tab.label}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 bottom-0 h-[2px] bg-[#c9a96e] transition-opacity",
                  selected ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-[24px] bg-white p-4 text-[var(--color-ink)] shadow-[0_44px_90px_-34px_rgb(4_12_28/0.6),0_14px_32px_-20px_rgb(4_12_28/0.35)] ring-1 ring-[rgb(11_31_58/0.05)] sm:p-6 lg:p-7">
        <div
          role="tabpanel"
          id={`${baseId}-panel-flights`}
          aria-labelledby={`${baseId}-tab-flights`}
          hidden={heroTab !== "flights"}
        >
          <FlightSearchWidget variant="hero" popularRoutes={popularRoutes} />
          <HomeTravelDetails />
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel-tours`}
          aria-labelledby={`${baseId}-tab-tours`}
          hidden={heroTab !== "tours"}
        >
          <PanelBody
            eyebrow="Gilgit-Baltistan"
            title="Tours of the North"
            text="Hunza, Skardu, Fairy Meadows, Deosai, Naltar and Khunjerab. Tell us your dates and group size and our team will plan it with you."
            primary={{ href: "/tours", label: "Browse tour packages" }}
            whatsappText="Hi GB International Travel, I'd like to ask about a Gilgit-Baltistan tour."
          />
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel-visa`}
          aria-labelledby={`${baseId}-tab-visa`}
          hidden={heroTab !== "visa"}
        >
          <PanelBody
            eyebrow="Visa services"
            title="Visa information and help"
            text="Guides for popular destinations for travellers from Pakistan, and a team to ask when you are unsure. Requirements change, so always verify with the official authorities."
            primary={{ href: "/visa", label: "View visa guides" }}
            whatsappText="Hi GB International Travel, I have a question about a visa."
          />
        </div>
      </div>
    </div>
  );
}

function PanelBody({
  eyebrow,
  title,
  text,
  primary,
  whatsappText,
}: {
  eyebrow: string;
  title: string;
  text: string;
  primary: { href: string; label: string };
  whatsappText: string;
}): ReactNode {
  return (
    <div className="grid gap-6 py-1 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12">
      <div>
        <p className="text-[0.625rem] font-semibold tracking-[0.2em] text-[#8b6e3e] uppercase">
          {eyebrow}
        </p>
        <h2
          className={cn(
            homeDisplayFont.className,
            "mt-2 text-[1.75rem] leading-tight font-medium tracking-[-0.005em] text-[var(--color-navy)] sm:text-[2rem]",
          )}
        >
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--color-muted)]">
          {text}
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <Link
          href={primary.href}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#0a8761,#066a4c)] px-7 text-[0.9375rem] font-semibold text-white shadow-[0_14px_28px_-12px_rgb(6_101_72/0.7)] transition-colors hover:bg-[linear-gradient(180deg,#09785a,#055c42)]"
        >
          {primary.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <a
          href={whatsappHref(undefined, whatsappText)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-sm font-medium text-[var(--color-navy)] underline decoration-[#c9a96e] decoration-1 underline-offset-[6px] transition-colors hover:text-[#8b6e3e]"
        >
          Ask on WhatsApp
        </a>
      </div>
    </div>
  );
}

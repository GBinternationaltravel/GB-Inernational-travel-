"use client";

import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PREFILL_ROUTE_EVENT } from "@/features/flights/components/flight-search-widget";
import { homeDisplayFont } from "@/features/home/home-fonts";
import { buildResultsHref, defaultSearchFormValues } from "@/lib/flights/search-params";
import { cn } from "@/lib/utils";

const routes = [
  { origin: "ISB", destination: "KDU", from: "Islamabad", to: "Skardu", kind: "Domestic" },
  { origin: "ISB", destination: "GIL", from: "Islamabad", to: "Gilgit", kind: "Domestic" },
  { origin: "ISB", destination: "DXB", from: "Islamabad", to: "Dubai", kind: "International" },
  { origin: "LHE", destination: "JED", from: "Lahore", to: "Jeddah", kind: "Umrah" },
] as const;

/**
 * Popular routes without prices: a click prefills the hero search (From/To) and scrolls to it.
 * Without JavaScript the link opens the results page for that route (date still to choose).
 */
export function HomePopularRoutes() {
  function checkFares(origin: string, destination: string) {
    window.dispatchEvent(new CustomEvent(PREFILL_ROUTE_EVENT, { detail: { origin, destination } }));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("search")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <section aria-labelledby="popular-routes-title" className="bg-white">
      <Container className="py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-[0.625rem] font-semibold tracking-[0.3em] text-[#8b6e3e] uppercase">
            <span className="h-px w-8 bg-[#c9a96e]" aria-hidden />
            Flights
          </p>
          <h2
            id="popular-routes-title"
            className={cn(
              homeDisplayFont.className,
              "mt-4 text-[2.25rem] leading-[1.08] font-medium tracking-[-0.01em] text-[var(--color-navy)] sm:text-[2.75rem]",
            )}
          >
            Popular routes
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--color-muted)]">
            Choose a route, add your dates and see the all-inclusive fare in PKR. Our team issues
            your ticket and stays with you on WhatsApp.
          </p>
        </div>

        <ul className="mt-10 grid gap-3 sm:mt-12 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {routes.map((route) => (
            <li key={`${route.origin}-${route.destination}`}>
              <a
                href={buildResultsHref({
                  ...defaultSearchFormValues(),
                  tripType: "ONE_WAY",
                  origin: route.origin,
                  destination: route.destination,
                })}
                onClick={(event) => {
                  event.preventDefault();
                  checkFares(route.origin, route.destination);
                }}
                className="group flex h-full flex-col rounded-[18px] border border-[#ebe5da] bg-white p-5 transition-[border-color,box-shadow] sm:p-6 duration-300 hover:border-[#d8c7a5] hover:shadow-[0_24px_48px_-28px_rgb(11_31_58/0.35)]"
              >
                <span className="text-[0.5625rem] font-semibold tracking-[0.26em] text-[#8b6e3e] uppercase">
                  {route.kind}
                </span>
                <span
                  className={cn(
                    homeDisplayFont.className,
                    "mt-3 block text-[1.5rem] leading-tight font-medium text-[var(--color-navy)] sm:mt-4 lg:text-[1.375rem] xl:text-[1.4375rem]",
                  )}
                >
                  {route.from}
                  <span className="mx-2 text-[#c9a96e]" aria-hidden>
                    →
                  </span>
                  <span className="sr-only"> to </span>
                  {route.to}
                </span>
                <span className="mt-1 text-xs tracking-[0.18em] text-[var(--color-muted-soft)]">
                  {route.origin} – {route.destination}
                </span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium sm:mt-8 text-[var(--color-navy)]">
                  Check fares
                  <ArrowRight
                    className="h-4 w-4 text-[#8b6e3e] transition-transform group-hover:translate-x-1"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

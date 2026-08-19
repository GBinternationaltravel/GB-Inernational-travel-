import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bell, CloudSun, MapPinned, ShieldCheck } from "lucide-react";
import { HomeHeroSearch } from "@/features/home/home-hero-search";
import { QuickAssistanceLoader } from "@/components/chatbot/quick-assistance-loader";
import { Section, SectionHeader } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  foundationFaqs,
  popularDomesticDestinations,
  popularInternationalDestinations,
} from "@/data/mock/content";
import { mockRouteList, getHomepageSampleOffers } from "@/data/mock/flights";
import { siteConfig } from "@/config/site";
import { calculateOfferPriceSnapshot } from "@/lib/booking/pricing";
import { formatPrice } from "@/lib/flights/filter-sort";

export function HomePage() {
  const sampleOffers = getHomepageSampleOffers();

  return (
    <>
      <section className="relative overflow-hidden bg-[var(--color-navy)] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 60% at 15% 20%, rgb(21 151 229 / 0.35), transparent 55%), radial-gradient(ellipse 50% 45% at 90% 10%, rgb(8 127 91 / 0.28), transparent 50%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 sm:pt-16 lg:px-8 lg:pb-20">
          <h1 className="font-display max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-4xl sm:leading-[1.15] lg:text-5xl lg:leading-[1.12]">
            {siteConfig.name}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/75 sm:mt-4 sm:text-lg sm:leading-relaxed lg:text-xl lg:text-white/80">
            Your trusted partner for domestic & international flights, tours, visas and travel
            services.
          </p>
          <HomeHeroSearch />
        </div>
      </section>

      <Section>
        <SectionHeader
          title="Popular flights from Pakistan"
          description="Sample routes for development. Prices include GB service fee where shown — not live airline fares."
        />
        <div className="grid gap-0 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {sampleOffers.map((offer) => {
            const first = offer.segments[0];
            const last = offer.segments[offer.segments.length - 1];
            if (!first || !last) return null;
            const pricing = calculateOfferPriceSnapshot(offer);
            return (
              <div
                key={offer.id}
                className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-semibold text-[var(--color-navy)]">
                    {first.origin.city} → {last.destination.city}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {first.airline.name} · {first.flightNumber}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <Badge variant="warning">Mock price</Badge>
                  <p className="mt-1 text-xl font-bold text-[var(--color-navy)]">
                    {formatPrice(pricing.total, pricing.currency)}
                  </p>
                  <p className="text-xs text-[var(--color-muted-soft)]">
                    Incl. service fee {formatPrice(pricing.fees, pricing.currency)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          Try routes such as {mockRouteList.slice(0, 4).join(", ")}.
        </p>
      </Section>

      <Section className="bg-white">
        <SectionHeader
          title="Featured offers"
          description="Verified deals appear here once supplier inventory is connected."
        />
        <Alert variant="info">
          No live deals are published yet. Browse the deals page for the latest available offers.
        </Alert>
        <div className="mt-6">
          <Link
            href="/deals"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-sky)]"
          >
            View deals <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>

      <Section>
        <SectionHeader
          title="Popular Pakistan destinations"
          description="Domestic routes customers commonly search from major Pakistani cities."
        />
        <div className="grid gap-6 sm:grid-cols-3">
          {popularDomesticDestinations.map((destination) => (
            <Link
              key={destination.slug}
              href="/destinations"
              className="group block border-b border-[var(--color-border)] pb-4 transition-colors"
            >
              <p className="text-2xl font-semibold text-[var(--color-navy)] transition-colors group-hover:text-[var(--color-emerald)]">
                {destination.name}
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{destination.summary}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section className="bg-white">
        <SectionHeader
          title="Popular international destinations"
          description="International gateways frequently searched from Pakistan."
        />
        <div className="grid gap-6 sm:grid-cols-3">
          {popularInternationalDestinations.map((destination) => (
            <Link
              key={destination.slug}
              href="/destinations"
              className="group block border-b border-[var(--color-border)] pb-4"
            >
              <p className="text-2xl font-semibold text-[var(--color-navy)] transition-colors group-hover:text-[var(--color-emerald)]">
                {destination.name}
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{destination.summary}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          title="Travel with confidence"
          description="Flight booking, destination weather, travel alerts and guides — in one trusted platform."
        />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <CompanionItem
            icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
            title="Secure booking"
            text="Clear pricing with supplier fare and GB service fee shown separately."
          />
          <CompanionItem
            icon={<CloudSun className="h-5 w-5" aria-hidden />}
            title="Destination weather"
            text="Plan with weather insight for Gilgit-Baltistan and international cities."
          />
          <CompanionItem
            icon={<Bell className="h-5 w-5" aria-hidden />}
            title="Travel alerts"
            text="Road, flight and weather updates for safer travel planning."
          />
          <CompanionItem
            icon={<MapPinned className="h-5 w-5" aria-hidden />}
            title="Local expertise"
            text="Pakistan-first service with international reach and destination guides."
          />
        </div>
      </Section>

      <Section className="bg-white">
        <SectionHeader
          title="Why GB International Travel"
          description="A Pakistan-first platform built for trust, clarity and premium service."
        />
        <ul className="grid gap-3 text-sm text-[var(--color-muted)] sm:grid-cols-2">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-emerald)]" />
            PKR-first booking with transparent service fees
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-emerald)]" />
            Domestic and international route coverage
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-emerald)]" />
            Professional ticketing and trip support
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-emerald)]" />
            Gilgit-Baltistan tours and travel updates
          </li>
        </ul>
      </Section>

      <Section>
        <SectionHeader
          title="Travel guides"
          description="Editorial guides for destinations across Pakistan and beyond."
        />
        <Link
          href="/travel-guides"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-sky)]"
        >
          Browse travel guides <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Section>

      <Section className="bg-white">
        <SectionHeader
          title="FAQs"
          description="Quick answers about booking with GB International Travel."
        />
        <div className="space-y-4">
          {foundationFaqs.map((faq) => (
            <details key={faq.id} className="border-b border-[var(--color-border)] pb-4">
              <summary className="cursor-pointer font-semibold text-[var(--color-navy)]">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{faq.answer}</p>
            </details>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/faq" className="text-sm font-semibold text-[var(--color-sky)]">
            View all FAQs
          </Link>
        </div>
      </Section>

      <Section>
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-navy)] px-6 py-12 text-white sm:px-10">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to plan your next trip?
          </h2>
          <p className="mt-3 max-w-2xl text-white/75">
            Search flights, explore tours, and manage your bookings in one place.
          </p>
          <div className="mt-6">
            <Link
              href="/flights"
              className="inline-flex h-12 items-center rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-6 text-base font-semibold text-white hover:bg-[var(--color-emerald-dark)]"
            >
              Book a Flight
            </Link>
          </div>
        </div>
      </Section>

      <QuickAssistanceLoader />
    </>
  );
}

function CompanionItem({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div>
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-emerald)_12%,white)] text-[var(--color-emerald)]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-navy)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{text}</p>
    </div>
  );
}

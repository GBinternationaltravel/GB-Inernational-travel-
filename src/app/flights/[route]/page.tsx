import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { siteConfig } from "@/config/site";
import { flightRoutePages, getFlightRoutePage } from "@/data/flight-routes";
import { buildResultsHref, defaultSearchFormValues } from "@/lib/flights/search-params";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo/metadata";
import { whatsappHref } from "@/lib/contact-links";

type Props = { params: Promise<{ route: string }> };

export function generateStaticParams() {
  return flightRoutePages.map((route) => ({ route: route.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { route: slug } = await params;
  const route = getFlightRoutePage(slug);
  if (!route) return buildMetadata({ title: "Flights", path: `/flights/${slug}`, noIndex: true });
  return buildMetadata({
    title: route.title,
    description: route.description,
    path: `/flights/${route.slug}`,
  });
}

export default async function FlightRoutePage({ params }: Props) {
  const { route: slug } = await params;
  const route = getFlightRoutePage(slug);
  if (!route) notFound();

  const searchHref = buildResultsHref({
    ...defaultSearchFormValues(),
    tripType: "ONE_WAY",
    origin: route.origin,
    destination: route.destination,
    returnDate: "",
  });
  const message = `Hi ${siteConfig.name}, please check a published fare from ${route.originCity} (${route.origin}) to ${route.destinationCity} (${route.destination}).`;
  const jsonLd = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Flights", path: "/flights" },
    { name: route.h1, path: `/flights/${route.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        title={route.h1}
        description={route.description}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Flights", href: "/flights" },
          { label: route.h1 },
        ]}
      />
      <Section>
        <div className="max-w-3xl space-y-4 text-sm leading-7 text-[var(--color-ink)]">
          <p>{route.intro}</p>
          <p>{route.detail}</p>
          <p>
            Airlines this site is set up to describe include PIA, airblue, AirSial, Fly Jinnah and
            Emirates. Which of those we currently sell on {route.origin}–{route.destination} is an
            owner check. TODO: verify before treating one airline as available on your date.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link
              href={searchHref}
              className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-navy)] px-4 text-sm font-semibold text-white"
            >
              Search {route.origin} to {route.destination}
            </Link>
            <a
              href={whatsappHref(siteConfig.contactWhatsApp, message)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-emerald)] px-4 text-sm font-semibold text-white"
            >
              {siteConfig.contactWhatsAppLabel}
            </a>
          </div>
          <ul className="list-disc space-y-1 pl-5 pt-4">
            {route.related.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-[var(--color-brand)] hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}

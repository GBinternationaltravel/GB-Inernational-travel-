import type { Metadata } from "next";
import { FlightSearchWidget } from "@/features/flights/components/flight-search-widget";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/config/site";
import { telHref, whatsappHref } from "@/lib/contact-links";

export const metadata: Metadata = buildMetadata({
  title: "International Flights",
  description:
    "Search international flights from Pakistan published by GB International Travel. Live airline connectivity is not enabled.",
  path: "/flights/international",
});

export default function InternationalFlightsPage() {
  return (
    <>
      <PageHero
        title="International Flights"
        description="Search international flights we currently publish, or ask our team to confirm a fare. Live airline connectivity is not enabled on this website."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Flights", href: "/flights" },
          { label: "International" },
        ]}
      />
      <Section>
        <FlightSearchWidget />
        <Alert variant="info" className="mt-6">
          These are published inventory fares, not a live airline or GDS feed. WhatsApp{" "}
          <a
            href={whatsappHref(
              siteConfig.contactWhatsApp,
              "Hi GB International Travel, I would like an international flight fare.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--color-navy)] underline"
          >
            {siteConfig.contactWhatsApp}
          </a>{" "}
          or call{" "}
          <a href={telHref(siteConfig.contactPhone)} className="font-medium text-[var(--color-navy)] underline">
            {siteConfig.contactPhone}
          </a>
          .
        </Alert>
      </Section>
    </>
  );
}

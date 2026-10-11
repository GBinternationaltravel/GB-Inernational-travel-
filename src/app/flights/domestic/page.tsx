import type { Metadata } from "next";
import { FlightSearchWidget } from "@/features/flights/components/flight-search-widget";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/config/site";
import { telHref, whatsappHref } from "@/lib/contact-links";

export const metadata: Metadata = buildMetadata({
  title: "Domestic Flights",
  description:
    "Search domestic flights within Pakistan from the inventory published by GB International Travel.",
  path: "/flights/domestic",
});

export default function DomesticFlightsPage() {
  return (
    <>
      <PageHero
        title="Domestic Flights"
        description="Search domestic flights within Pakistan from our published inventory, or contact us on WhatsApp to request a fare."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Flights", href: "/flights" },
          { label: "Domestic" },
        ]}
      />
      <Section>
        <FlightSearchWidget />
        <Alert variant="info" className="mt-6">
          Availability and the final fare should be confirmed with our team. Online card payment is
          not available yet. WhatsApp{" "}
          <a
            href={whatsappHref(
              siteConfig.contactWhatsApp,
              "Hi GB International Travel, I would like a domestic flight fare.",
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

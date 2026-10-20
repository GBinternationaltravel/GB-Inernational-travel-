import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description: `About ${siteConfig.name} — a Pakistan-based travel agency.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="About"
        description={`${siteConfig.name} is a Pakistan-based travel agency.`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About" },
        ]}
      />
      <Section>
        <div className="max-w-3xl space-y-4 text-[var(--color-muted)]">
          <p>
            {siteConfig.name} is a Pakistan-based agency. This website lets you search the flights
            we publish and contact our team. We confirm bookings and issue tickets manually. Online
            card payment is not available.
          </p>
          {siteConfig.legalName ? <p>Legal name: {siteConfig.legalName}</p> : null}
          {siteConfig.officeAddress ? <p>Office: {siteConfig.officeAddress}</p> : null}
          {siteConfig.licenceNumber ? <p>Licence: {siteConfig.licenceNumber}</p> : null}
          {siteConfig.accreditation ? <p>Accreditation: {siteConfig.accreditation}</p> : null}
          {siteConfig.reviewsSummary ? <p>Reviews: {siteConfig.reviewsSummary}</p> : null}
        </div>
      </Section>
    </>
  );
}

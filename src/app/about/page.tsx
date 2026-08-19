import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description: `About ${siteConfig.name} — a Pakistan-based travel portal foundation.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="About"
        description={`${siteConfig.name} is being built as a Pakistan-first flight and travel platform.`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About" },
        ]}
      />
      <Section>
        <div className="max-w-3xl space-y-4 text-[var(--color-muted)]">
          <p>
            This website foundation supports flight search, destination discovery, travel guides,
            and trip tools. Live airline booking, payments, and notifications will be added in
            carefully scoped phases.
          </p>
          <p>
            We do not invent company history, customer reviews, or performance statistics. Those
            details will be published only when verified.
          </p>
        </div>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Terms",
  description: "Terms of use placeholder for GB International Travel.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <PageHero
        title="Terms"
        description="Formal terms of use will be finalized before live bookings launch."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Terms" },
        ]}
      />
      <Section>
        <p className="max-w-3xl text-sm text-[var(--color-muted)]">
          This foundation page reserves the route for production terms covering bookings, user
          responsibilities, and service limitations.
        </p>
      </Section>
    </>
  );
}

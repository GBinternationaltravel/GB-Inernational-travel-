import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Refund Policy",
  description: "Refund policy placeholder for GB International Travel.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <>
      <PageHero
        title="Refund Policy"
        description="Refund rules will follow airline fare rules and payment provider policies."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Refund Policy" },
        ]}
      />
      <Section>
        <p className="max-w-3xl text-sm text-[var(--color-muted)]">
          Detailed refund timelines and eligibility will be published when live ticketing is
          enabled. No invented refund guarantees are stated here.
        </p>
      </Section>
    </>
  );
}

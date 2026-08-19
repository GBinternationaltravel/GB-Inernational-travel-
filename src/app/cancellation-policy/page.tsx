import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Cancellation Policy",
  description: "Cancellation policy placeholder for GB International Travel.",
  path: "/cancellation-policy",
});

export default function CancellationPolicyPage() {
  return (
    <>
      <PageHero
        title="Cancellation Policy"
        description="Cancellation handling will depend on fare conditions from the selected supplier."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Cancellation Policy" },
        ]}
      />
      <Section>
        <p className="max-w-3xl text-sm text-[var(--color-muted)]">
          This route is prepared for a production cancellation policy. Specific airline fare rules
          will not be fabricated.
        </p>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "Privacy policy placeholder for GB International Travel.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        title="Privacy Policy"
        description="A full legal policy will be published before collecting personal customer data in production."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Privacy Policy" },
        ]}
      />
      <Section>
        <div className="max-w-3xl space-y-3 text-sm text-[var(--color-muted)]">
          <p>
            This page is a foundation placeholder. Production privacy terms will cover account data,
            booking data, cookies, and third-party processors.
          </p>
          <p>We will not store payment card data on our own servers.</p>
        </div>
      </Section>
    </>
  );
}

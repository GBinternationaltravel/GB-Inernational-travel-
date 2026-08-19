import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description: "Contact GB International Travel. Form handling will be connected in a later phase.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact"
        description="Get in touch. Submission delivery will be connected after notification providers are configured."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Contact" },
        ]}
      />
      <Section>
        <Alert variant="info" className="mb-6 max-w-2xl">
          Contact form UI will be wired to validated server actions and email delivery in a later
          phase. No invented phone numbers or office addresses are shown here.
        </Alert>
        <form className="grid max-w-xl gap-4">
          <label className="grid gap-1.5 text-sm">
            Name
            <input
              name="name"
              className="h-11 rounded-md border border-[var(--color-border)] px-3"
              placeholder="Your name"
              disabled
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Email
            <input
              name="email"
              type="email"
              className="h-11 rounded-md border border-[var(--color-border)] px-3"
              placeholder="you@example.com"
              disabled
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Message
            <textarea
              name="message"
              className="min-h-32 rounded-md border border-[var(--color-border)] px-3 py-2"
              placeholder="How can we help?"
              disabled
            />
          </label>
          <button
            type="button"
            disabled
            className="h-11 rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white opacity-60"
          >
            Send message (coming soon)
          </button>
        </form>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { buildMetadata, faqJsonLd } from "@/lib/seo/metadata";
import { foundationFaqs } from "@/data/mock/content";

export const metadata: Metadata = buildMetadata({
  title: "FAQ",
  description: "Frequently asked questions about GB International Travel.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            faqJsonLd(
              foundationFaqs.map((faq) => ({
                question: faq.question,
                answer: faq.answer,
              })),
            ),
          ),
        }}
      />
      <PageHero
        title="FAQ"
        description="Answers about the current foundation phase."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "FAQ" },
        ]}
      />
      <Section>
        <div className="mx-auto max-w-3xl space-y-4">
          {foundationFaqs.map((faq) => (
            <details
              key={faq.id}
              className="border-b border-[var(--color-border)] pb-4"
            >
              <summary className="cursor-pointer font-medium">{faq.question}</summary>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{faq.answer}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}

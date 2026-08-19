import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo/metadata";
import { listPublishedVisaGuides } from "@/services/visa-guide-service";

export const metadata: Metadata = buildMetadata({
  title: "Visa Information",
  description:
    "Informational visa guides for popular destinations. Always verify requirements with official authorities.",
  path: "/visa",
});

export default async function VisaIndexPage() {
  const guides = await listPublishedVisaGuides();

  return (
    <>
      <PageHero
        title="Visa Information"
        description="Professional guidance for travelers from Pakistan. Requirements change — always verify with official authorities."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Visa" },
        ]}
      />
      <Section>
        <Alert variant="warning" className="mb-6" title="Official verification required">
          Visa requirements may change. Please verify current requirements with official
          authorities before applying or traveling.
        </Alert>

        {guides.length === 0 ? (
          <Alert variant="info" title="Guides coming soon">
            Published visa guides will appear here once added in the admin CMS. Expected
            coverage includes UAE, Turkey, Thailand and Singapore.
          </Alert>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <li
                key={guide.id}
                className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
              >
                <Badge variant="info">{guide.visaType || "Visa guide"}</Badge>
                <h2 className="mt-3 text-xl font-semibold text-[var(--color-navy)]">
                  <Link
                    href={`/visa/${guide.slug}`}
                    className="hover:text-[var(--color-emerald)]"
                  >
                    {guide.countryName}
                    {guide.cityName ? ` · ${guide.cityName}` : ""}
                  </Link>
                </h2>
                {guide.processingInfo ? (
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {guide.processingInfo}
                  </p>
                ) : null}
                <Link
                  href={`/visa/${guide.slug}`}
                  className="mt-4 inline-flex h-10 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-navy)] hover:border-[var(--color-sky)] hover:text-[var(--color-sky)]"
                >
                  View Visa Information
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

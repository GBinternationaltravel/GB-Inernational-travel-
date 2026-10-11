import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { PageHero } from "@/components/layout/page-shell";
import { Section } from "@/components/ui/section";
import { siteConfig } from "@/config/site";
import { mailtoHref, telHref, whatsappHref } from "@/lib/contact-links";

/** Date shown as "Last updated" on every policy page. */
export const LEGAL_LAST_UPDATED = "4 October 2026";

export type LegalSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

const policyLinks = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Cancellation Policy", href: "/cancellation-policy" },
] as const;

/** Shared layout for the Terms, Privacy, Refund and Cancellation pages. */
export function LegalPage({
  title,
  description,
  path,
  intro,
  sections,
}: {
  title: string;
  description: string;
  path: string;
  intro?: React.ReactNode;
  sections: LegalSection[];
}) {
  const related = policyLinks.filter((item) => item.href !== path);

  return (
    <>
      <PageHero
        title={title}
        description={description}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: title }]}
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-24">
              <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-[var(--color-muted-soft)] uppercase">
                On this page
              </p>
              <ol className="space-y-2 text-sm">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-navy)]"
                    >
                      {index + 1}. {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="max-w-3xl">
            <p className="text-sm font-medium text-[var(--color-muted)]">
              Last updated: {LEGAL_LAST_UPDATED}
            </p>
            {intro ? (
              <div className="mt-4 space-y-3 text-base leading-relaxed text-[var(--color-text-secondary)]">
                {intro}
              </div>
            ) : null}

            <div className="mt-8 space-y-10">
              {sections.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--color-navy)]">
                    {index + 1}. {section.title}
                  </h2>
                  <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>

            <LegalContactCard />

            <div className="mt-8 border-t border-[var(--color-border)] pt-6">
              <p className="text-sm font-semibold text-[var(--color-navy)]">Related policies</p>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {related.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="font-medium text-[var(--color-brand)] hover:underline">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </Section>
    </>
  );
}

/** Bulleted list styled for policy text. */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-[var(--color-emerald)]">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/** Inline link for policy text. */
export function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className = "font-medium text-[var(--color-brand)] underline-offset-2 hover:underline";
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

/** Our email address as a mailto link. */
export function ContactEmail() {
  return <LegalLink href={mailtoHref()}>{siteConfig.contactEmail}</LegalLink>;
}

function LegalContactCard() {
  const items = [
    {
      icon: Phone,
      label: "Phone",
      value: siteConfig.contactPhone,
      href: telHref(),
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: siteConfig.contactWhatsApp,
      href: whatsappHref(),
    },
    {
      icon: Mail,
      label: "Email",
      value: siteConfig.contactEmail,
      href: mailtoHref(),
    },
  ];

  return (
    <div className="mt-12 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-card)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">Questions about this policy?</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Contact {siteConfig.name}. Please include your booking reference if your question is about a
        booking.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.label}>
            <a
              href={item.href}
              className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-sky)]"
              {...(item.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-emerald)]" aria-hidden />
              <span className="min-w-0">
                <span className="block text-xs font-semibold tracking-wide text-[var(--color-muted-soft)] uppercase">
                  {item.label}
                </span>
                <span className="block text-sm font-medium break-words text-[var(--color-navy)]">
                  {item.value}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

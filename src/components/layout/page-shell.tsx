import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import type { BreadcrumbItem } from "@/types/content";

export function PageHero({
  title,
  description,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
}) {
  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-navy)] text-white">
      <Container className="py-10 sm:py-12">
        {breadcrumbs ? (
          <Breadcrumb items={breadcrumbs} tone="onDark" className="mb-4" />
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-base text-white/75">{description}</p>
        ) : null}
      </Container>
    </div>
  );
}

export function ComingSoonPanel({
  title,
  description,
  ctaHref = "/flights",
  ctaLabel = "Go to Flights",
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <Section>
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold text-[var(--color-navy)]">{title}</h2>
        <p className="mt-3 text-[var(--color-muted)]">{description}</p>
        <Link
          href={ctaHref}
          className="mt-6 inline-flex text-sm font-semibold text-[var(--color-sky)]"
        >
          {ctaLabel}
        </Link>
      </div>
    </Section>
  );
}

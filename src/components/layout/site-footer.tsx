import Link from "next/link";
import { Plane } from "lucide-react";
import { footerNavigation, siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";

export function SiteFooter() {
  const socialLinks = (
    [
      { label: "Twitter", href: siteConfig.social.twitter },
      { label: "Facebook", href: siteConfig.social.facebook },
      { label: "Instagram", href: siteConfig.social.instagram },
    ] as const
  ).filter((item) => Boolean(item.href));

  return (
    <footer className="border-t border-white/10 bg-[var(--color-navy)] text-white">
      <Container className="grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-emerald)]">
              <Plane className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-base font-semibold tracking-tight">{siteConfig.name}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            Flights, tours and travel services from Pakistan to destinations around the world.
          </p>
          {socialLinks.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-3">
              {socialLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <FooterColumn title="Travel" items={footerNavigation.travel} />
        <FooterColumn title="Company" items={footerNavigation.company} />
        <FooterColumn title="Policies" items={footerNavigation.legal} />
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p>
            Primary currency: {siteConfig.currency} · Market: {siteConfig.market}
          </p>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-white/50 uppercase">
        {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-white/75 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

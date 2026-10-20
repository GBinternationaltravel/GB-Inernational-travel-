import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h1 className="font-display text-4xl text-[var(--color-navy)]">Page not found</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
        That address is not on {siteConfig.name}. Search a flight or contact the team. A missing
        page is not a fare and not a ticket.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="inline-flex h-11 items-center rounded-md bg-[var(--color-navy)] px-4 text-sm font-semibold text-white">
          Home
        </Link>
        <Link href="/flights" className="inline-flex h-11 items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-semibold">
          Search flights
        </Link>
        <Link href="/contact" className="inline-flex h-11 items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-semibold">
          Contact
        </Link>
      </div>
    </div>
  );
}

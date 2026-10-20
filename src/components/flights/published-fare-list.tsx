import { formatPrice } from "@/lib/flights/filter-sort";
import { bookOnWhatsAppHref, quoteOnWhatsAppHref } from "@/lib/flights/whatsapp-booking";
import type { PublishedFareRow } from "@/lib/flights/published-route-fares";

export function PublishedFareList({
  fares,
  pagePath,
  origin,
  destination,
  heading = "Published fares",
  emptyCopy,
  quoteIntro,
  quoteNote,
}: {
  fares: PublishedFareRow[];
  pagePath: string;
  origin: string;
  destination: string;
  heading?: string;
  emptyCopy?: string;
  quoteIntro?: string;
  quoteNote?: string;
}) {
  if (fares.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <h2 className="font-display text-2xl text-[var(--color-navy)]">{heading}</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {emptyCopy ??
            `No published fare is listed for ${origin} to ${destination} right now. Ask us for a quote. A quote is not a ticket.`}
        </p>
        <a
          href={quoteOnWhatsAppHref({
            origin,
            destination,
            pagePath,
            intro: quoteIntro,
            note: quoteNote,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-md bg-[var(--color-emerald)] px-4 text-sm font-semibold text-white sm:w-auto"
        >
          Ask for a quote on WhatsApp
        </a>
      </div>
    );
  }

  const lowest = fares[0]!.totalPkr;

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
      <h2 className="font-display text-2xl text-[var(--color-navy)]">{heading}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        From <strong className="text-[var(--color-navy)]">{formatPrice(lowest, "PKR")}</strong> for 1
        adult. Each figure is one published total, including our booking amount. It is confirmed
        before ticketing and is not a live airline price.
      </p>
      <ul className="mt-4 space-y-3">
        {fares.map((fare) => (
          <li key={fare.id} className="rounded-lg border border-[var(--color-border)] p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--color-navy)]">
                  {fare.airline} {fare.flightNumber}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {fare.origin} → {fare.destination} · {fare.date} · {fare.departureTime}–{fare.arrivalTime}
                </p>
                <p className="mt-2 font-display text-2xl text-[var(--color-navy)]">
                  {formatPrice(fare.totalPkr, "PKR")}
                </p>
              </div>
              <a
                href={bookOnWhatsAppHref({
                  origin: fare.origin,
                  destination: fare.destination,
                  date: fare.date,
                  airline: fare.airline,
                  flightTime: fare.departureTime,
                  passengers: "1 adult",
                  farePkr: fare.totalPkr,
                  pagePath,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center rounded-md bg-[var(--color-emerald)] px-4 text-sm font-semibold text-white sm:w-auto sm:min-w-44"
              >
                Book on WhatsApp
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

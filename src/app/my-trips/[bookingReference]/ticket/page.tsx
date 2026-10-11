import type { Metadata } from "next";
import Link from "next/link";
import { Plane } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getETicketForViewer } from "@/services/eticket-service";
import { BookingServiceError } from "@/services/booking-service";
import { Container } from "@/components/ui/container";
import { Alert } from "@/components/ui/alert";
import { PrintTicketButton } from "@/features/booking/print-ticket-button";
import { siteConfig } from "@/config/site";
import {
  ETICKET_TIME_ZONE,
  ETICKET_TIME_ZONE_LABEL,
  eTicketPath,
  formatTicketAmount,
  formatTicketDate,
} from "@/lib/booking/eticket";
import { buildMetadata } from "@/lib/seo/metadata";
import { CUSTOMER_FARE_LABEL } from "@/lib/booking/customer-price";

type Params = { params: Promise<{ bookingReference: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { bookingReference } = await params;
  return {
    ...buildMetadata({
      title: `E-ticket ${bookingReference}`,
      path: eTicketPath(bookingReference),
      noIndex: true,
    }),
    robots: { index: false, follow: false },
  };
}

/** A4 page box for this page only (the rest of the site keeps browser defaults). */
const printPageCss = "@page { size: A4; margin: 12mm; }";

export default async function ETicketPage({ params }: Params) {
  const { bookingReference } = await params;
  const user = await requireUser(eTicketPath(bookingReference));

  let ticket;
  try {
    ticket = await getETicketForViewer(user, bookingReference);
  } catch (error) {
    // Same message whether the booking doesn't exist or belongs to someone else.
    if (error instanceof BookingServiceError) return <TicketNotInAccount />;
    throw error;
  }

  const tripHref = ticket.viewerIsStaff
    ? `/admin/bookings/${encodeURIComponent(ticket.reference)}`
    : `/my-trips/${encodeURIComponent(ticket.reference)}`;
  const backLabel = ticket.viewerIsStaff ? "← Back to admin booking" : "← Back to trip";

  if (!ticket.ticketed) {
    const cancelled = ["CANCELLED", "REFUNDED", "EXPIRED", "FAILED"].includes(ticket.status);
    return (
      <Container className="max-w-2xl py-10">
        <Link href={tripHref} className="text-sm text-[var(--color-brand)]">
          {backLabel}
        </Link>
        <h1 className="mt-4 font-display text-3xl">Your e-ticket isn&apos;t ready yet</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Booking {ticket.reference}</p>
        <Alert variant={cancelled ? "warning" : "info"} className="mt-6">
          {cancelled
            ? "This booking is no longer active, so there is no e-ticket to show. Please contact us if you think this is a mistake."
            : "We are still issuing the ticket for this booking with the airline. As soon as it is issued you will get an email, and your printable e-ticket will appear here."}
        </Alert>
        <p className="mt-6 text-sm text-[var(--color-muted)]">
          Questions? Email{" "}
          <a href={`mailto:${siteConfig.contactEmail}`} className="font-medium text-[var(--color-brand)]">
            {siteConfig.contactEmail}
          </a>{" "}
          or call {siteConfig.contactPhone}.
        </p>
      </Container>
    );
  }

  const { segment, price } = ticket;

  return (
    <Container className="py-6 sm:py-10 print:p-0">
      <style>{printPageCss}</style>

      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={tripHref} className="text-sm text-[var(--color-brand)]">
          {backLabel}
        </Link>
        <PrintTicketButton />
      </div>

      <article className="gb-eticket mx-auto max-w-[210mm] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white text-[13px] leading-snug text-[var(--color-ink)] shadow-[var(--shadow-card)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        {/* Brand band */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--color-navy)] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-emerald)]">
              <Plane className="h-5 w-5 text-white" aria-hidden />
            </span>
            <div>
              <p className="text-base font-semibold tracking-tight">{siteConfig.name}</p>
              <h1 className="text-xs font-normal tracking-normal text-white/70">
                E-ticket · Itinerary receipt
              </h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] tracking-[0.12em] text-white/60 uppercase">Airline PNR</p>
            <p className="font-mono text-2xl font-bold tracking-widest">{ticket.pnr}</p>
          </div>
        </div>
        <div className="h-1 bg-[var(--color-gold)]" />

        <div className="space-y-5 px-6 py-5">
          {/* Booking facts */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Fact label="Booking reference" value={ticket.reference} mono />
            <Fact label="Airline PNR" value={ticket.pnr ?? "—"} mono />
            <Fact
              label="Issue date"
              value={ticket.issuedAt ? formatTicketDate(ticket.issuedAt) : "—"}
            />
            <div>
              <dt className="text-[11px] tracking-wide text-[var(--color-muted)] uppercase">Status</dt>
              <dd className="mt-0.5">
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                  Ticketed · Confirmed
                </span>
              </dd>
            </div>
          </dl>

          {/* Passengers */}
          <section>
            <SectionTitle>Passengers</SectionTitle>
            <table className="mt-2 w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[11px] tracking-wide text-[var(--color-muted)] uppercase">
                  <th className="py-1.5 pr-3 font-medium">#</th>
                  <th className="py-1.5 pr-3 font-medium">Passenger name</th>
                  <th className="py-1.5 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {ticket.passengers.map((passenger, index) => (
                  <tr key={passenger.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-1.5 pr-3 text-[var(--color-muted)]">{index + 1}</td>
                    <td className="py-1.5 pr-3 font-semibold">{passenger.name}</td>
                    <td className="py-1.5">{passenger.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs">
              <span className="text-[var(--color-muted)]">E-ticket number(s): </span>
              {ticket.ticketNumbers.length > 0 ? (
                <span className="font-mono font-semibold">{ticket.ticketNumbers.join(", ")}</span>
              ) : (
                <span>Not provided — use the airline PNR {ticket.pnr} for check-in.</span>
              )}
            </p>
          </section>

          {/* Flight */}
          <section>
            <SectionTitle>Flight</SectionTitle>
            <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2">
                <p className="font-semibold text-[var(--color-navy)]">
                  {segment.airlineName}
                  {segment.airlineCode ? ` (${segment.airlineCode})` : ""} · Flight {segment.flightNumber}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {segment.cabin} · {segment.baggage}
                </p>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
                <Endpoint
                  label="Departure"
                  time={segment.departure.time}
                  date={segment.departure.date}
                  localTime={segment.departure.localTime}
                  airport={segment.from}
                />
                <div className="text-center text-xs text-[var(--color-muted)]">
                  <Plane className="mx-auto h-4 w-4 text-[var(--color-emerald)]" aria-hidden />
                  <p className="mt-1">{segment.duration}</p>
                  <p>{segment.stops === 0 ? "Non-stop" : `${segment.stops} stop${segment.stops > 1 ? "s" : ""}`}</p>
                </div>
                <Endpoint
                  label="Arrival"
                  time={segment.arrival.time}
                  date={segment.arrival.date}
                  localTime={segment.arrival.localTime}
                  airport={segment.to}
                  alignRight
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-muted)]">
              All times are Pakistan local time ({ETICKET_TIME_ZONE_LABEL}, {ETICKET_TIME_ZONE}).
              {ticket.itineraryNote ? ` ${ticket.itineraryNote}` : ""}
            </p>
          </section>

          <div className="grid gap-5 sm:grid-cols-2 print:grid-cols-2">
            {/* Payment */}
            <section>
              <SectionTitle>Payment</SectionTitle>
              <dl className="mt-2 space-y-1">
                <Row label={CUSTOMER_FARE_LABEL} value={formatTicketAmount(price.total, price.currency)} />
                <div className="flex items-baseline justify-between gap-3 border-t border-[var(--color-border)] pt-1.5">
                  <dt className="font-semibold">Total paid</dt>
                  <dd className="text-base font-bold text-[var(--color-navy)]">
                    {formatTicketAmount(price.total, price.currency)}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Travel notes */}
            <section>
              <SectionTitle>Before you fly</SectionTitle>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                <li>
                  Reach the airport at least <strong>{ticket.checkInHours} hours</strong> before
                  departure ({ticket.domestic ? "domestic" : "international"} flight).
                </li>
                <li>
                  Carry your original{" "}
                  {ticket.domestic ? "CNIC or passport" : "passport (and visa, if required)"}.
                  The name must match this ticket.
                </li>
                <li>
                  Check in online on the {segment.airlineName} website or app using PNR{" "}
                  <span className="font-mono font-semibold">{ticket.pnr}</span>, where available.
                </li>
                <li>Flight times can change — confirm with the airline before you travel.</li>
              </ul>
            </section>
          </div>

          {/* Contact */}
          <section className="rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] px-4 py-3 text-xs">
            <p className="font-semibold text-[var(--color-navy)]">Need help? Contact {siteConfig.name}</p>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span>Phone: {siteConfig.contactPhone}</span>
              <span>WhatsApp: {siteConfig.contactWhatsApp}</span>
              <span>Email: {siteConfig.contactEmail}</span>
              <span>Web: {siteConfig.url.replace(/^https?:\/\//, "")}</span>
            </p>
          </section>

          <p className="text-[11px] text-[var(--color-muted)]">
            This itinerary receipt was issued by {siteConfig.name} for booking {ticket.reference}.
            Check-in, boarding and baggage are subject to the operating airline&apos;s conditions of
            carriage.
          </p>
        </div>
      </article>
    </Container>
  );
}

function TicketNotInAccount() {
  return (
    <Container className="max-w-2xl py-10">
      <Link href="/my-trips" className="text-sm text-[var(--color-brand)]">
        ← My Trips
      </Link>
      <h1 className="mt-4 font-display text-3xl">We couldn&apos;t find this e-ticket</h1>
      <Alert variant="info" className="mt-6">
        This booking isn&apos;t linked to the account you are signed in with. If you booked as a
        guest, open your{" "}
        <Link href="/account" className="font-medium underline">
          Account
        </Link>{" "}
        page on the device you booked from to link the booking, then try again.
      </Alert>
      <p className="mt-6 text-sm text-[var(--color-muted)]">
        Still stuck? Email{" "}
        <a href={`mailto:${siteConfig.contactEmail}`} className="font-medium text-[var(--color-brand)]">
          {siteConfig.contactEmail}
        </a>{" "}
        or call {siteConfig.contactPhone} with your booking reference.
      </p>
    </Container>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b-2 border-[var(--color-emerald)] pb-1 text-xs font-semibold tracking-[0.12em] text-[var(--color-navy)] uppercase">
      {children}
    </h2>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-[var(--color-muted)] uppercase">{label}</dt>
      <dd className={`mt-0.5 font-semibold ${mono ? "font-mono tracking-wide" : ""}`}>{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Endpoint({
  label,
  time,
  date,
  localTime,
  airport,
  alignRight = false,
}: {
  label: string;
  time: string;
  date: string;
  localTime?: string | null;
  airport: { code: string; city: string; name: string | null };
  alignRight?: boolean;
}) {
  return (
    <div className={alignRight ? "text-right" : ""}>
      <p className="text-[11px] tracking-wide text-[var(--color-muted)] uppercase">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-navy)]">
        {time} <span className="text-sm font-semibold">{airport.code}</span>
      </p>
      <p className="font-medium">{date}</p>
      {localTime ? (
        <p className="text-xs text-[var(--color-muted)]">
          {localTime} local time in {airport.city}
        </p>
      ) : null}
      <p className="mt-0.5">{airport.city}</p>
      {airport.name ? <p className="text-xs text-[var(--color-muted)]">{airport.name}</p> : null}
    </div>
  );
}

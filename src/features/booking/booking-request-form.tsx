"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { telHref, whatsappHref } from "@/lib/contact-links";
import { calculateCombinedOfferPriceSnapshot } from "@/lib/booking/pricing";
import { formatPrice } from "@/lib/flights/filter-sort";
import { readSelectedFlight } from "@/lib/flights/selection";
import { bookingRequestSchema } from "@/lib/validations/booking-request";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";

type Selection = NonNullable<ReturnType<typeof readSelectedFlight>>;

export function BookingRequestForm() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [passengerNames, setPassengerNames] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    setSelection(readSelectedFlight());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <Container className="py-10">
        <p className="text-sm text-[var(--color-muted)]">Loading your flight…</p>
      </Container>
    );
  }

  if (!selection) {
    return (
      <Container className="py-10">
        <h1 className="font-display text-3xl">Request a booking</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--color-muted)]">
          Choose a published fare first. This form sends a request to our team. It does not confirm
          a seat or take a card payment.
        </p>
        <Link href="/flights" className="mt-6 inline-flex text-sm font-semibold text-[var(--color-brand)]">
          Search flights
        </Link>
      </Container>
    );
  }

  const offer = selection.offer;
  const first = offer.segments[0];
  const snapshot = calculateCombinedOfferPriceSnapshot(
    selection.returnOffer ? [offer, selection.returnOffer] : [offer],
  );
  const priceLabel = formatPrice(snapshot.total, snapshot.currency);
  const namedTravellers = selection.search.adults + (selection.search.children ?? 0);
  const quote = `Hi ${siteConfig.name}, booking request ${reference ?? ""}. ${selection.search.origin} to ${selection.search.destination} on ${selection.search.departureDate}. Price shown: ${priceLabel}.`;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const payload = {
      name,
      phone,
      email,
      passengerNames,
      origin: selection!.search.origin,
      destination: selection!.search.destination,
      departureDate: selection!.search.departureDate,
      returnDate: selection!.search.returnDate ?? "",
      airline: first?.airline.name ?? "",
      flightNumber: first?.flightNumber ?? "",
      returnFlightNumber: selection!.returnOffer?.segments[0]?.flightNumber ?? "",
      priceLabel,
      adults: selection!.search.adults,
      children: selection!.search.children ?? 0,
      infants: selection!.search.infants ?? 0,
      companyWebsite,
    };
    const parsed = bookingRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        reference?: string;
        message?: string;
        fieldErrors?: Record<string, string>;
      };
      if (!response.ok || !result.ok || !result.reference) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.message ?? "We could not send that request. Please try WhatsApp.");
        return;
      }
      setReference(result.reference);
    } catch {
      setFormError("We could not send that request. Please use WhatsApp or call us.");
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <Container className="py-10">
        <h1 className="font-display text-3xl">Request received</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--color-muted)]">
          Your reference is <strong className="text-[var(--color-navy)]">{reference}</strong>. This
          is a booking request, not a ticket. Our team will confirm availability and price before
          ticketing.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={whatsappHref(siteConfig.contactWhatsApp, quote)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--color-emerald)] px-5 text-sm font-semibold text-white"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {siteConfig.contactWhatsAppLabel} {siteConfig.contactWhatsApp}
          </a>
          <a
            href={telHref(siteConfig.contactPhone)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] px-5 text-sm font-semibold"
          >
            <Phone className="h-4 w-4" aria-hidden />
            {siteConfig.contactPhoneLabel} {siteConfig.contactPhone}
          </a>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-10">
      <h1 className="font-display text-3xl">Request a booking</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
        This is a booking request, not a ticket. Our team will confirm availability and price
        before ticketing. Online card payment is not available.
      </p>

      <section className="mt-6 max-w-2xl rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <h2 className="font-display text-xl">Flight</h2>
        <p className="mt-2 text-sm">
          {selection.search.origin} → {selection.search.destination} · {selection.search.departureDate}
          {selection.search.returnDate ? ` · return ${selection.search.returnDate}` : ""}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {first?.airline.name} {first?.flightNumber}
          {selection.returnOffer
            ? ` · return ${selection.returnOffer.segments[0]?.flightNumber ?? ""}`
            : ""}
        </p>
        <p className="mt-3 font-display text-2xl">{priceLabel}</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Indicative published fare, confirmed when we accept the request.
        </p>
      </section>

      <form onSubmit={onSubmit} className="mt-6 max-w-2xl space-y-4" noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}
        <Input label="Your name" name="name" value={name} onChange={(event) => setName(event.target.value)} error={errors.name} autoComplete="name" />
        <Input label="Phone" name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} error={errors.phone} autoComplete="tel" hint="Include the country code" />
        <Input label="Email (optional)" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} error={errors.email} autoComplete="email" />
        {namedTravellers > 1 ? (
          <label className="block text-sm">
            <span className="font-medium">Passenger names</span>
            <textarea
              name="passengerNames"
              value={passengerNames}
              onChange={(event) => setPassengerNames(event.target.value)}
              className="mt-1.5 min-h-28 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
              placeholder="One full name per line"
            />
            {errors.passengerNames ? <span className="mt-1 block text-xs text-red-600">{errors.passengerNames}</span> : null}
          </label>
        ) : null}
        <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
          <label>
            Company website
            <input
              name="companyWebsite"
              tabIndex={-1}
              autoComplete="off"
              value={companyWebsite}
              onChange={(event) => setCompanyWebsite(event.target.value)}
            />
          </label>
        </div>
        <Button type="submit" size="lg" className="h-12 w-full sm:w-auto" isLoading={submitting}>
          Send booking request
        </Button>
      </form>
    </Container>
  );
}

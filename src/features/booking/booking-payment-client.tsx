"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Container } from "@/components/ui/container";
import { BookingProgress } from "@/features/booking/booking-progress";
import { formatPrice } from "@/lib/flights/filter-sort";
import type { SafeBookingView } from "@/types/booking";
import { CUSTOMER_FARE_LABEL } from "@/lib/booking/customer-price";
import { siteConfig } from "@/config/site";
import { telHref, whatsappHref } from "@/lib/contact-links";

export function BookingPaymentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("ref");
  const [booking, setBooking] = useState<SafeBookingView | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!reference) {
        setError("Missing booking reference.");
        setReady(true);
        return;
      }
      try {
        const response = await fetch(`/api/bookings/${encodeURIComponent(reference)}`);
        const data = (await response.json()) as {
          booking?: SafeBookingView;
          error?: string;
        };
        if (!response.ok || !data.booking) {
          if (!cancelled) setError(data.error ?? "We couldn't load this booking.");
        } else if (!cancelled) {
          setBooking(data.booking);
          if (
            data.booking.status === "PAYMENT_RECEIVED" ||
            data.booking.status === "TICKETING_PENDING"
          ) {
            router.replace(
              `/booking/confirmation?ref=${encodeURIComponent(data.booking.reference)}`,
            );
          }
        }
      } catch {
        if (!cancelled) setError("We couldn't load this booking for payment.");
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reference, router]);

  if (!ready) return <LoadingState label="Loading booking request…" />;

  if (!booking) {
    return (
      <Container className="py-10">
        <ErrorState
          title="We couldn't load this booking request."
          description={error ?? "Please return to review or start a new search."}
          action={
            <Link
              href="/flights"
              className="inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
            >
              Return to Flight Search
            </Link>
          }
        />
      </Container>
    );
  }

  const assistanceMessage = `Hi GB International Travel, I would like help with booking ${booking.reference}.`;

  return (
    <div className="pb-10">
      <Container className="py-6">
        <BookingProgress current="payment" reference={booking.reference} />
        <div className="mt-6 max-w-xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl">Booking request</h1>
            <Badge variant="info">Payment by arrangement</Badge>
          </div>

          <Alert variant="warning" className="mb-6">
            Online card payment is not available on this website yet. Paying later, or sending
            payment as our team advises, does not issue a ticket. Our staff issue tickets manually
            after they confirm the flight.
          </Alert>

          <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
            <p className="text-sm text-[var(--color-muted)]">Booking reference</p>
            <p className="font-display text-2xl">{booking.reference}</p>
            <p className="mt-4 text-sm text-[var(--color-muted)]">Published fare to confirm</p>
            <p className="font-display text-3xl">
              {formatPrice(booking.totalAmount, booking.currency)}
            </p>
            <dl className="mt-3 space-y-1 text-sm text-[var(--color-muted)]">
              {booking.offer.outboundSupplierFare != null &&
              booking.offer.returnSupplierFare != null ? (
                <>
                  <div className="flex justify-between gap-3">
                    <dt>Outbound published fare</dt>
                    <dd>
                      {formatPrice(booking.offer.outboundSupplierFare, booking.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Return published fare</dt>
                    <dd>
                      {formatPrice(booking.offer.returnSupplierFare, booking.currency)}
                    </dd>
                  </div>
                </>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt>{CUSTOMER_FARE_LABEL}</dt>
                <dd>{formatPrice(booking.totalAmount, booking.currency)}</dd>
              </div>
            </dl>
            <Alert variant="warning" className="mt-4">
              {booking.pricingNotice}
            </Alert>
            <Alert variant="info" className="mt-3">
              Contact our team to confirm availability and the accepted payment method. A booking
              request is not a confirmed ticket.
            </Alert>

            {error ? (
              <Alert variant="error" className="mt-4">
                {error}
              </Alert>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
              <a
                href={whatsappHref(siteConfig.contactWhatsApp, assistanceMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-4 text-sm font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp {siteConfig.contactWhatsApp}
              </a>
              <a
                href={telHref(siteConfig.contactPhone)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-navy)] hover:bg-[var(--color-surface-muted)]"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Call {siteConfig.contactPhone}
              </a>
            </div>

            <Link
              href={`/booking/review?ref=${encodeURIComponent(booking.reference)}`}
              className="mt-4 inline-flex w-full justify-center text-sm text-[var(--color-brand)]"
            >
              Back to review
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

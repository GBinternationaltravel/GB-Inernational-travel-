"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Container } from "@/components/ui/container";
import { BookingProgress } from "@/features/booking/booking-progress";
import { formatPrice } from "@/lib/flights/filter-sort";
import type { SafeBookingView } from "@/types/booking";

export function BookingPaymentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("ref");
  const [booking, setBooking] = useState<SafeBookingView | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function startCheckout() {
    if (!booking) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: booking.reference }),
      });
      const data = (await response.json()) as {
        redirectUrl?: string;
        error?: string;
        payment?: { isMock?: boolean };
      };
      if (!response.ok || !data.redirectUrl) {
        setError(data.error ?? "We couldn't start checkout.");
        setSubmitting(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("We couldn't start checkout right now.");
      setSubmitting(false);
    }
  }

  if (!ready) return <LoadingState label="Loading payment…" />;

  if (!booking) {
    return (
      <Container className="py-10">
        <ErrorState
          title="We couldn't load this booking for payment."
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

  return (
    <div className="pb-10">
      <Container className="py-6">
        <BookingProgress current="payment" reference={booking.reference} />
        <div className="mt-6 max-w-xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl">Payment</h1>
            <Badge variant="info">Secure checkout</Badge>
          </div>

          <Alert variant="info" className="mb-6">
            Amount is taken from your stored booking total on the server. No card
            details are collected on this page.
          </Alert>

          <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
            <p className="text-sm text-[var(--color-muted)]">Booking reference</p>
            <p className="font-display text-2xl">{booking.reference}</p>
            <p className="mt-4 text-sm text-[var(--color-muted)]">Amount due</p>
            <p className="font-display text-3xl">
              {formatPrice(booking.totalAmount, booking.currency)}
            </p>
            <dl className="mt-3 space-y-1 text-sm text-[var(--color-muted)]">
              <div className="flex justify-between gap-3">
                <dt>Base fare</dt>
                <dd>{formatPrice(booking.subtotalAmount, booking.currency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Taxes</dt>
                <dd>{formatPrice(booking.taxesAmount, booking.currency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>GB service fee</dt>
                <dd>{formatPrice(booking.feesAmount, booking.currency)}</dd>
              </div>
            </dl>
            <Alert variant="warning" className="mt-4">
              {booking.pricingNotice}
            </Alert>
            <Alert variant="warning" className="mt-3">
              Paying does not issue an airline ticket. After a successful payment your
              booking stays awaiting ticket confirmation until a live supplier
              integration confirms issuance.
            </Alert>

            {error ? (
              <Alert variant="error" className="mt-4">
                {error}
              </Alert>
            ) : null}

            <Button
              type="button"
              size="lg"
              className="mt-6 w-full"
              disabled={submitting}
              onClick={() => void startCheckout()}
            >
              {submitting ? "Starting checkout…" : "Complete Payment"}
            </Button>

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

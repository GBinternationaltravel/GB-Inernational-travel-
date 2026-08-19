"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { BookingProgress } from "@/features/booking/booking-progress";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { formatPrice } from "@/lib/flights/filter-sort";
import type { SafeBookingView } from "@/types/booking";

export function BookingConfirmationClient() {
  const searchParams = useSearchParams();
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
          if (!cancelled) setError(data.error ?? "Booking not found.");
        } else if (!cancelled) {
          setBooking(data.booking);
        }
      } catch {
        if (!cancelled) setError("Could not load confirmation.");
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  if (!ready) return <LoadingState label="Loading confirmation…" />;

  if (!booking || error) {
    return (
      <Container className="py-10">
        <ErrorState
          title="Confirmation unavailable"
          description={error ?? "Please check My Trips or contact support."}
          action={
            <Link
              href="/my-trips"
              className="inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
            >
              My Trips
            </Link>
          }
        />
      </Container>
    );
  }

  const paymentReceived =
    booking.status === "PAYMENT_RECEIVED" || booking.status === "TICKETING_PENDING";

  return (
    <div className="pb-10">
      <Container className="py-6">
        <BookingProgress current="confirmation" reference={booking.reference} />
        <div className="mx-auto mt-8 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={booking.status} />
            {booking.store === "file" ? (
              <Badge variant="warning">Local file store</Badge>
            ) : null}
          </div>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--color-navy)]">
            {paymentReceived ? "Booking confirmed" : "Booking update"}
          </h1>

          {paymentReceived ? (
            <>
              <p className="mt-4 text-lg text-[var(--color-ink)]">
                Payment received successfully. Your booking reference is ready — ticket issuance
                may still be pending.
              </p>
              <Alert variant="warning" className="mt-6" title="Ticket issuance pending">
                A successful payment does <strong>not</strong> mean an airline ticket has been
                issued. No PNR, e-ticket number, airline confirmation, or boarding pass is
                generated until ticketing is completed by GB International Travel.
              </Alert>
            </>
          ) : (
            <Alert variant="info" className="mt-6">
              Current booking status is {booking.status}. If you have not completed payment yet,
              continue from the payment page.
            </Alert>
          )}

          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--color-muted)]">Booking reference</dt>
                <dd className="text-xl font-bold text-[var(--color-navy)]">{booking.reference}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Payment status</dt>
                <dd className="font-semibold">{booking.status.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Amount</dt>
                <dd className="text-xl font-bold text-[var(--color-emerald)]">
                  {formatPrice(booking.totalAmount, booking.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Ticket status</dt>
                <dd className="font-semibold">
                  {booking.status === "CONFIRMED"
                    ? "Ticket issued"
                    : paymentReceived
                      ? "Ticket issuance pending"
                      : "Not issued"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Flight</dt>
                <dd className="font-medium">
                  {booking.offer.airlineName} · {booking.offer.flightNumber}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Route</dt>
                <dd className="font-medium">
                  {booking.offer.originCity} → {booking.offer.destinationCity}
                </dd>
              </div>
            </dl>
            <Alert variant="info" className="mt-4">
              {booking.pricingNotice}
            </Alert>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/my-trips"
              className="inline-flex h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-4 text-sm font-semibold text-white"
            >
              View in My Trips
            </Link>
            {!paymentReceived ? (
              <Link
                href={`/booking/payment?ref=${encodeURIComponent(booking.reference)}`}
                className="inline-flex h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-sky)] px-4 text-sm font-semibold text-white"
              >
                Continue to payment
              </Link>
            ) : null}
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-navy)] hover:bg-[var(--color-surface-muted)]"
            >
              Contact support
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

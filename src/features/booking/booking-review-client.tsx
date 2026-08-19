"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Container } from "@/components/ui/container";
import { BookingProgress } from "@/features/booking/booking-progress";
import {
  formatDuration,
  formatFlightDate,
  formatFlightTime,
  formatPrice,
  formatBaggageLabel,
  stopsLabel,
} from "@/lib/flights/filter-sort";
import { cabinClasses, passengerTypeLabels } from "@/config/booking";
import type { SafeBookingView } from "@/types/booking";

type RevalidateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | {
      kind: "price_changed";
      previousTotal: number;
      currentTotal: number;
      currency: string;
      difference: number;
    }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

export function BookingReviewClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("ref");
  const [booking, setBooking] = useState<SafeBookingView | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [priceAccepted, setPriceAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revalidateState, setRevalidateState] = useState<RevalidateState>({
    kind: "idle",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!reference) {
        setError("missing");
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
          if (!cancelled) {
            setError(data.error ?? "not_found");
            setReady(true);
          }
          return;
        }
        if (!cancelled) {
          setBooking(data.booking);
          setAccepted(data.booking.termsAccepted);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setError("load_failed");
          setReady(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  async function runRevalidation(current: SafeBookingView): Promise<RevalidateState> {
    const response = await fetch("/api/flights/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        internalOfferId: current.offer.internalOfferId || current.offer.offerId,
        supplierOfferId: current.offer.supplierOfferId,
        supplierCode: current.offer.supplierCode,
        supplierSessionRef: current.offer.supplierSessionRef ?? null,
        // Supplier fare only — markup is applied server-side after revalidation.
        expectedTotal:
          current.offer.pricing.supplierFare ??
          current.subtotalAmount + current.taxesAmount,
        currency: current.currency,
      }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      status?: string;
      previousTotal?: number;
      currentTotal?: number;
      currency?: string;
      message?: string;
      error?: string;
    };

    if (!response.ok && !data.status) {
      return {
        kind: "error",
        message: data.error ?? "We couldn't revalidate this flight right now.",
      };
    }

    if (data.status === "EXPIRED" || data.status === "NO_AVAILABILITY") {
      return {
        kind: "unavailable",
        message: "Your selected flight is no longer available.",
      };
    }

    if (data.status === "PRICE_CHANGED") {
      const previousTotal = data.previousTotal ?? current.totalAmount;
      const currentTotal = data.currentTotal ?? current.totalAmount;
      return {
        kind: "price_changed",
        previousTotal,
        currentTotal,
        currency: data.currency ?? current.currency,
        difference: currentTotal - previousTotal,
      };
    }

    if (data.status === "VALID" || data.ok) {
      return { kind: "idle" };
    }

    return {
      kind: "error",
      message: data.message ?? data.error ?? "We couldn't revalidate this flight right now.",
    };
  }

  async function continueToPayment() {
    if (!booking) return;
    setActionError(null);

    if (!accepted) {
      setActionError(
        "Please confirm you have reviewed the passenger information and booking details.",
      );
      return;
    }

    setSubmitting(true);
    setRevalidateState({ kind: "checking" });
    try {
      const check = await runRevalidation(booking);
      setRevalidateState(check);

      if (check.kind === "unavailable") {
        return;
      }
      if (check.kind === "error") {
        setActionError(check.message);
        return;
      }
      if (check.kind === "price_changed") {
        if (!priceAccepted) {
          setActionError("Please accept the updated flight price to continue.");
          return;
        }

        const acceptResponse = await fetch(
          `/api/bookings/${encodeURIComponent(booking.reference)}/accept-price`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accepted: true,
              // Customer totals (markup included) — never raw supplier fare.
              previousTotal: booking.totalAmount,
              acceptedTotal: check.currentTotal,
            }),
          },
        );
        const acceptData = (await acceptResponse.json()) as {
          booking?: SafeBookingView;
          error?: string;
        };
        if (!acceptResponse.ok || !acceptData.booking) {
          if (acceptResponse.status === 409) {
            setRevalidateState({
              kind: "unavailable",
              message: "Your selected flight is no longer available.",
            });
            return;
          }
          setActionError(acceptData.error ?? "We couldn't update the booking price.");
          return;
        }
        setBooking(acceptData.booking);
        setRevalidateState({ kind: "idle" });
        setPriceAccepted(false);
      }

      const supplierResponse = await fetch(
        `/api/bookings/${encodeURIComponent(booking.reference)}/supplier-book`,
        { method: "POST" },
      );
      const supplierData = (await supplierResponse.json()) as {
        booking?: SafeBookingView;
        supplierResult?: { ok?: boolean; code?: string; message?: string };
        error?: string;
        code?: string;
      };
      if (supplierResponse.status === 409) {
        if (/price has changed/i.test(supplierData.error ?? "")) {
          setActionError(
            supplierData.error ??
              "Your selected flight price has changed. Please accept the updated price.",
          );
          return;
        }
        setRevalidateState({
          kind: "unavailable",
          message: "Your selected flight is no longer available.",
        });
        return;
      }
      if (!supplierResponse.ok && supplierResponse.status >= 500) {
        setActionError(
          supplierData.error ?? "We couldn't create the supplier reservation right now.",
        );
        return;
      }
      if (supplierData.booking) {
        setBooking(supplierData.booking);
      }

      const response = await fetch(
        `/api/bookings/${encodeURIComponent(booking.reference)}/accept-terms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accepted: true }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(data.error ?? "We couldn't continue right now. Please try again.");
        return;
      }
      router.push(`/booking/payment?ref=${encodeURIComponent(booking.reference)}`);
    } catch {
      setActionError("We couldn't continue right now. Please try again.");
      setRevalidateState({ kind: "idle" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return <LoadingState label="Loading booking review…" />;
  }

  if (error || !booking) {
    return (
      <Container className="py-10">
        <ErrorState
          title={
            error === "missing"
              ? "Booking reference missing"
              : "We couldn't load this booking."
          }
          description="Your booking session may have expired or is unavailable in this browser."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/booking/passengers"
                className="inline-flex h-11 items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium"
              >
                Back to passengers
              </Link>
              <Link
                href="/flights"
                className="inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
              >
                Return to Flight Search
              </Link>
            </div>
          }
        />
      </Container>
    );
  }

  if (revalidateState.kind === "unavailable") {
    return (
      <Container className="py-10">
        <ErrorState
          title="Your selected flight is no longer available."
          description="The supplier offer expired or sold out. Please search again or return to your results."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/flights"
                className="inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
              >
                Search Again
              </Link>
              <Link
                href="/flights/results"
                className="inline-flex h-11 items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium"
              >
                Return to Results
              </Link>
            </div>
          }
        />
      </Container>
    );
  }

  const offer = booking.offer;
  const cabinLabel =
    cabinClasses.find((item) => item.value === offer.cabinClass)?.label ?? offer.cabinClass;

  return (
    <div className="pb-10">
      <Container className="py-6">
        <BookingProgress current="review" reference={booking.reference} />

        <div className="mt-6 mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-[var(--color-ink)]">Review booking</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Booking reference{" "}
              <span className="font-medium text-[var(--color-ink)]">{booking.reference}</span>
            </p>
          </div>
          <Badge variant="warning">
            {offer.isMock ? "Mock inventory" : "Supplier fare — pending ticket confirmation"}
          </Badge>
        </div>

        {booking.store === "file" ? (
          <Alert variant="warning" className="mb-4">
            PostgreSQL is not connected. This draft is stored in the local development file store.
            Configure DATABASE_URL and run Prisma db push for production-ready persistence.
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
              <h2 className="font-display text-xl">Flight</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-[var(--color-muted)]">From</p>
                  <p className="font-medium">
                    {offer.originCity} ({offer.origin})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-muted)]">To</p>
                  <p className="font-medium">
                    {offer.destinationCity} ({offer.destination})
                  </p>
                </div>
                <ReviewItem label="Departure date" value={formatFlightDate(offer.departureAt)} />
                <ReviewItem label="Departure time" value={formatFlightTime(offer.departureAt)} />
                <ReviewItem label="Arrival time" value={formatFlightTime(offer.arrivalAt)} />
                <ReviewItem label="Duration" value={formatDuration(offer.durationMinutes)} />
                <ReviewItem label="Stops" value={stopsLabel(offer.stops)} />
                <ReviewItem label="Airline" value={offer.airlineName} />
                <ReviewItem label="Flight number" value={offer.flightNumber} />
                <ReviewItem label="Cabin" value={cabinLabel} />
                <ReviewItem
                  label="Baggage"
                  value={formatBaggageLabel({
                    baggageKg: offer.baggageKg,
                    baggageIncluded: offer.baggageIncluded,
                  })}
                />
              </div>
            </section>

            <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
              <h2 className="font-display text-xl">Passengers</h2>
              <ul className="mt-4 space-y-3">
                {booking.passengers.map((passenger) => (
                  <li
                    key={passenger.id}
                    className="border-b border-[var(--color-border)] pb-3 last:border-0"
                  >
                    <p className="font-medium">
                      {passenger.firstName}
                      {passenger.middleName ? ` ${passenger.middleName}` : ""} {passenger.lastName}
                    </p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {passengerTypeLabels[passenger.type as keyof typeof passengerTypeLabels] ??
                        passenger.type}{" "}
                      · {passenger.nationality} · Passport ending in {passenger.passportMasked}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
              <h2 className="font-display text-xl">Contact</h2>
              <div className="mt-3 space-y-2 text-sm">
                <p>Email: {booking.contactEmailMasked}</p>
                <p>Phone: {booking.contactPhoneMasked}</p>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
              <h2 className="font-display text-xl">Price breakdown</h2>
              <dl className="mt-4 space-y-3 text-sm">
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
                <div className="flex justify-between gap-3 border-t border-[var(--color-border)] pt-3 font-display text-xl">
                  <dt>Total</dt>
                  <dd>{formatPrice(booking.totalAmount, booking.currency)}</dd>
                </div>
              </dl>
              <dl className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt>Supplier</dt>
                  <dd>{booking.supplier.supplierCode ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Price status</dt>
                  <dd>{booking.supplier.priceStatus}</dd>
                </div>
                {booking.supplier.environment ? (
                  <div className="flex justify-between gap-3">
                    <dt>Environment</dt>
                    <dd>{booking.supplier.environment}</dd>
                  </div>
                ) : null}
              </dl>
              <Alert variant="warning" className="mt-4">
                {booking.pricingNotice}
              </Alert>
            </section>

            {revalidateState.kind === "price_changed" ? (
              <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
                <Alert variant="warning">Your selected flight price has changed.</Alert>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt>Previous price</dt>
                    <dd>
                      {formatPrice(revalidateState.previousTotal, revalidateState.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>New price</dt>
                    <dd>
                      {formatPrice(revalidateState.currentTotal, revalidateState.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 font-medium">
                    <dt>Difference</dt>
                    <dd>
                      {revalidateState.difference >= 0 ? "+" : ""}
                      {formatPrice(revalidateState.difference, revalidateState.currency)}
                    </dd>
                  </div>
                </dl>
                <label className="mt-4 flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={priceAccepted}
                    onChange={(event) => setPriceAccepted(event.target.checked)}
                  />
                  <span>I accept the updated flight price and want to continue.</span>
                </label>
              </section>
            ) : null}

            <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                />
                <span>
                  I have reviewed the passenger information and booking details. I agree to the{" "}
                  <Link href="/terms" className="text-[var(--color-brand)] underline">
                    Terms & Conditions
                  </Link>
                  ,{" "}
                  <Link href="/privacy-policy" className="text-[var(--color-brand)] underline">
                    Privacy Policy
                  </Link>
                  ,{" "}
                  <Link href="/refund-policy" className="text-[var(--color-brand)] underline">
                    Refund Policy
                  </Link>
                  , and{" "}
                  <Link href="/cancellation-policy" className="text-[var(--color-brand)] underline">
                    Cancellation Policy
                  </Link>
                  .
                </span>
              </label>

              {actionError ? (
                <Alert variant="error" className="mt-4">
                  {actionError}
                </Alert>
              ) : null}

              <Button
                type="button"
                size="lg"
                className="mt-4 w-full"
                onClick={() => void continueToPayment()}
                isLoading={submitting || revalidateState.kind === "checking"}
              >
                Continue to Payment
              </Button>
              <Link
                href="/booking/passengers"
                className="mt-3 inline-flex w-full justify-center text-sm text-[var(--color-brand)]"
              >
                Edit passenger details
              </Link>
            </section>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

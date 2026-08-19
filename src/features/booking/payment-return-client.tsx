"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { formatPrice } from "@/lib/flights/filter-sort";
import type { SafePaymentView } from "@/types/payment";

export function PaymentReturnClient() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");
  const reference = searchParams.get("ref");
  const clientStatus = searchParams.get("status");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<SafePaymentView | null>(null);
  const [outcome, setOutcome] = useState<"success" | "failure" | "pending" | "cancelled">(
    "pending",
  );
  const [bookingStatus, setBookingStatus] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!paymentId) {
        setError("Missing payment id.");
        setReady(true);
        return;
      }
      try {
        const response = await fetch("/api/payments/return", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, status: clientStatus }),
        });
        const data = (await response.json()) as {
          payment?: SafePaymentView;
          outcome?: "success" | "failure" | "pending" | "cancelled";
          bookingStatus?: string;
          error?: string;
        };
        if (!response.ok || !data.payment) {
          if (!cancelled) setError(data.error ?? "Could not process payment return.");
        } else if (!cancelled) {
          setPayment(data.payment);
          setOutcome(data.outcome ?? "pending");
          setBookingStatus(data.bookingStatus ?? "");
        }
      } catch {
        if (!cancelled) setError("Could not process payment return.");
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [paymentId, clientStatus]);

  if (!ready) return <LoadingState label="Checking payment result…" />;

  if (error || !payment) {
    return (
      <Container className="py-10">
        <ErrorState
          title="Payment result unavailable"
          description={error ?? "Please return to My Trips or contact support."}
          action={
            <Link
              href={reference ? `/booking/payment?ref=${encodeURIComponent(reference)}` : "/my-trips"}
              className="inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
            >
              Try again
            </Link>
          }
        />
      </Container>
    );
  }

  if (outcome === "success") {
    return (
      <Container className="py-10">
        <div className="mx-auto max-w-xl text-center">
          <Badge variant="success">Payment received</Badge>
          {payment.isMock ? (
            <Badge variant="warning" className="ml-2">
              Simulated / development
            </Badge>
          ) : null}
          <h1 className="mt-4 font-display text-3xl">Payment successful</h1>
          <p className="mt-3 text-[var(--color-muted)]">
            Payment received successfully. Your flight booking is awaiting ticket
            confirmation.
          </p>
          <Alert variant="warning" className="mt-6 text-left">
            This is not an airline ticket confirmation. No PNR, e-ticket, or boarding
            pass has been generated. Booking status: {bookingStatus || "PAYMENT_RECEIVED"}.
          </Alert>
          <Link
            href={`/booking/confirmation?ref=${encodeURIComponent(payment.bookingReference)}`}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-[var(--color-brand)] px-6 text-base font-medium text-white"
          >
            View confirmation
          </Link>
        </div>
      </Container>
    );
  }

  if (outcome === "failure") {
    return (
      <Container className="py-10">
        <div className="mx-auto max-w-xl">
          <Badge variant="error">Payment failed</Badge>
          {payment.isMock ? (
            <Badge variant="warning" className="ml-2">
              Simulated / development
            </Badge>
          ) : null}
          <h1 className="mt-4 font-display text-3xl">Payment unsuccessful</h1>
          <p className="mt-3 text-[var(--color-muted)]">
            {payment.failureReason ?? "Your payment could not be completed."}
          </p>
          <p className="mt-2 text-sm">
            Amount: {formatPrice(payment.amount, payment.currency)}
          </p>
          <Link
            href={`/booking/payment?ref=${encodeURIComponent(payment.bookingReference)}`}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-[var(--color-brand)] px-6 text-base font-medium text-white"
          >
            Try payment again
          </Link>
        </div>
      </Container>
    );
  }

  if (outcome === "cancelled") {
    return (
      <Container className="py-10">
        <div className="mx-auto max-w-xl">
          <h1 className="font-display text-3xl">Payment cancelled</h1>
          <p className="mt-3 text-[var(--color-muted)]">
            No charge was made. You can restart checkout when ready.
          </p>
          <Link
            href={`/booking/payment?ref=${encodeURIComponent(payment.bookingReference)}`}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-[var(--color-brand)] px-6 text-base font-medium text-white"
          >
            Return to payment
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-xl">
        <Badge variant="info">Payment pending</Badge>
        {payment.isMock ? (
          <Badge variant="warning" className="ml-2">
            Simulated / development
          </Badge>
        ) : null}
        <h1 className="mt-4 font-display text-3xl">Payment is being confirmed</h1>
        <p className="mt-3 text-[var(--color-muted)]">
          We are waiting for a verified payment confirmation from the provider. This
          page will not invent a ticket or PNR.
        </p>
        <Alert variant="info" className="mt-4">
          Booking status: {bookingStatus || "PAYMENT_PROCESSING"}
        </Alert>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/booking/payment/return?paymentId=${encodeURIComponent(payment.id)}&ref=${encodeURIComponent(payment.bookingReference)}`}
            className="inline-flex h-11 items-center rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium"
          >
            Refresh status
          </Link>
          <Link
            href="/my-trips"
            className="inline-flex h-11 items-center rounded-md px-4 text-sm font-medium hover:bg-[var(--color-surface-muted)]"
          >
            Go to My Trips
          </Link>
        </div>
      </div>
    </Container>
  );
}

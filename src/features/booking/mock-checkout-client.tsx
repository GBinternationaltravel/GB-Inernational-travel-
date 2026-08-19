"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { formatPrice } from "@/lib/flights/filter-sort";

export function MockCheckoutClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("paymentId");
  const reference = searchParams.get("ref");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<{
    amount: number;
    currency: string;
    isMock: boolean;
    status: string;
  } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!paymentId) {
        setError("Missing payment id.");
        setReady(true);
        return;
      }
      try {
        const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}`);
        const data = (await response.json()) as {
          payment?: {
            amount: number;
            currency: string;
            isMock: boolean;
            status: string;
          };
          error?: string;
        };
        if (!response.ok || !data.payment) {
          if (!cancelled) setError(data.error ?? "Payment not found.");
        } else if (!cancelled) {
          setPayment(data.payment);
        }
      } catch {
        if (!cancelled) setError("Could not load mock checkout.");
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  async function complete(status: "SUCCEEDED" | "FAILED" | "CANCELLED") {
    if (!paymentId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/mock-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status }),
      });
      const data = (await response.json()) as { error?: string; ok?: boolean };
      if (!response.ok) {
        setError(data.error ?? "Mock payment failed.");
        setBusy(false);
        return;
      }
      const clientStatus =
        status === "SUCCEEDED" ? "success" : status === "FAILED" ? "failed" : "cancelled";
      router.push(
        `/booking/payment/return?paymentId=${encodeURIComponent(paymentId)}&ref=${encodeURIComponent(reference ?? "")}&status=${clientStatus}`,
      );
    } catch {
      setError("Mock payment request failed.");
      setBusy(false);
    }
  }

  if (!ready) return <LoadingState label="Loading mock checkout…" />;

  if (!payment || error) {
    return (
      <Container className="py-10">
        <ErrorState
          title="Mock checkout unavailable"
          description={error ?? "This simulated payment session could not be loaded."}
          action={
            <Link
              href={reference ? `/booking/payment?ref=${encodeURIComponent(reference)}` : "/flights"}
              className="inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
            >
              Back to payment
            </Link>
          }
        />
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-lg rounded-xl border border-dashed border-amber-400 bg-amber-50 p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl">Mock payment checkout</h1>
          <Badge variant="warning">Development / simulated</Badge>
        </div>
        <Alert variant="warning" className="mb-4">
          This is a simulated payment provider. No real money is charged and no
          production credentials are used.
        </Alert>
        <p className="text-sm text-[var(--color-muted)]">Booking</p>
        <p className="font-medium">{reference}</p>
        <p className="mt-3 text-sm text-[var(--color-muted)]">Amount</p>
        <p className="font-display text-3xl">
          {formatPrice(payment.amount, payment.currency)}
        </p>

        {error ? (
          <Alert variant="error" className="mt-4">
            {error}
          </Alert>
        ) : null}

        <div className="mt-6 grid gap-3">
          <Button
            type="button"
            size="lg"
            disabled={busy}
            onClick={() => void complete("SUCCEEDED")}
          >
            Simulate successful payment
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={busy}
            onClick={() => void complete("FAILED")}
          >
            Simulate failed payment
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={busy}
            onClick={() => void complete("CANCELLED")}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Container>
  );
}

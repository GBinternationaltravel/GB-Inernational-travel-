"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function PaymentActionsForm({
  paymentId,
  canVerify,
  canRefund,
  existingProviderRef,
}: {
  paymentId: string;
  canVerify: boolean;
  canRefund: boolean;
  existingProviderRef?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerRef: String(form.get("providerRef") ?? ""),
          note: String(form.get("note") ?? "") || undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Verification failed.");
        setBusy(false);
        return;
      }
      setOk("Payment verified. Booking moved to ticketing pending.");
      router.refresh();
    } catch {
      setError("Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function refund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const refundReference = String(form.get("refundReference") ?? "");
    const confirmed = window.confirm(
      `Record refund ${refundReference} for this payment?\n\nThis marks the payment as REFUNDED in the system ledger. It does not automatically call a live payment provider.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundReference,
          reason: String(form.get("reason") ?? "") || undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Refund record failed.");
        setBusy(false);
        return;
      }
      setOk("Refund recorded.");
      router.refresh();
    } catch {
      setError("Refund record failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!canVerify && !canRefund) {
    return null;
  }

  return (
    <div className="space-y-4">
      {canVerify ? (
        <form
          onSubmit={verify}
          className="space-y-3 rounded-xl border border-[var(--color-border)] bg-white p-4"
        >
          <h2 className="font-display text-lg">Verify payment</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Record a transaction reference after offline or bank confirmation. No payment
            credentials are shown or required here.
          </p>
          <input
            name="providerRef"
            required
            defaultValue={existingProviderRef ?? ""}
            placeholder="Transaction reference"
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 font-mono text-sm"
          />
          <input
            name="note"
            placeholder="Optional note"
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Mark paid / verified"}
          </Button>
        </form>
      ) : null}

      {canRefund ? (
        <form
          onSubmit={refund}
          className="space-y-3 rounded-xl border border-[var(--color-border)] bg-white p-4"
        >
          <h2 className="font-display text-lg">Record refund</h2>
          <input
            name="refundReference"
            required
            placeholder="Refund reference"
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 font-mono text-sm"
          />
          <input
            name="reason"
            placeholder="Optional reason"
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
          <Button type="submit" variant="danger" disabled={busy}>
            {busy ? "Saving…" : "Record refund"}
          </Button>
        </form>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}
      {ok ? <Alert variant="success">{ok}</Alert> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/flights/filter-sort";
import { OFFLINE_PAYMENT_METHODS } from "@/lib/payment/offline";

const methodLabels: Record<(typeof OFFLINE_PAYMENT_METHODS)[number], string> = {
  BANK_TRANSFER: "Bank transfer",
  CASH: "Cash",
  WALLET: "Wallet / other transfer",
};

export function OfflinePaymentForm({
  bookingReference,
  expectedTotal,
  outstanding,
  currency,
  blockedReason,
}: {
  bookingReference: string;
  expectedTotal: number;
  outstanding: number;
  currency: string;
  blockedReason?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setOk(null);
    const form = new FormData(event.currentTarget);
    const rawAmount = String(form.get("amountReceived") ?? "").replace(/,/g, "");
    try {
      const response = await fetch(
        `/api/admin/bookings/${encodeURIComponent(bookingReference)}/offline-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: String(form.get("method") ?? ""),
            amountReceived: Number(rawAmount),
            receiptReference: String(form.get("receiptReference") ?? ""),
            note: String(form.get("note") ?? "") || undefined,
          }),
        },
      );
      const data = (await response.json()) as { error?: string; bookingStatus?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not record offline payment.");
        setBusy(false);
        return;
      }
      setOk(
        `Offline payment recorded. Booking is ${data.bookingStatus ?? "updated"}. Ticket issuance remains a separate step.`,
      );
      router.refresh();
    } catch {
      setError("Could not record offline payment.");
    } finally {
      setBusy(false);
    }
  }

  if (blockedReason) {
    return (
      <Alert variant="info">
        {blockedReason} Expected total {formatPrice(expectedTotal, currency)}.
      </Alert>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-[var(--color-border)] bg-white p-4"
    >
      <h2 className="font-display text-lg">Record offline payment</h2>
      <p className="text-sm text-[var(--color-muted)]">
        Use this when the customer paid by bank transfer, cash, or wallet. The amount must match
        the outstanding balance. This does not issue a ticket.
      </p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--color-muted)]">Expected total</dt>
          <dd className="font-medium">{formatPrice(expectedTotal, currency)}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-muted)]">Outstanding</dt>
          <dd className="font-medium">{formatPrice(outstanding, currency)}</dd>
        </div>
      </dl>
      <select
        name="method"
        required
        className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
        defaultValue="BANK_TRANSFER"
      >
        {OFFLINE_PAYMENT_METHODS.map((method) => (
          <option key={method} value={method}>
            {methodLabels[method]}
          </option>
        ))}
      </select>
      <input
        name="amountReceived"
        type="number"
        required
        min={1}
        step={1}
        defaultValue={outstanding}
        className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
        aria-label="Amount received"
      />
      <input
        name="receiptReference"
        required
        minLength={4}
        maxLength={120}
        placeholder="Bank transaction or receipt reference"
        className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 font-mono text-sm"
      />
      <input
        name="note"
        placeholder="Optional internal note"
        maxLength={500}
        className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
      />
      {error ? <Alert variant="error">{error}</Alert> : null}
      {ok ? <Alert variant="success">{ok}</Alert> : null}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Record offline payment"}
      </Button>
    </form>
  );
}

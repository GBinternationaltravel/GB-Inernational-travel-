"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function BookingStatusForm({
  reference,
  allowedTransitions,
}: {
  reference: string;
  allowedTransitions: string[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(allowedTransitions[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!status) return;
    if (status === "CANCELLED" || status === "REFUNDED") {
      const confirmed = window.confirm(
        `Confirm ${status} for booking ${reference}?\n\nThis cannot be undone from a single undo action. The customer may receive an email notification.`,
      );
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/bookings/${encodeURIComponent(reference)}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not update status.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not update status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-[var(--color-border)] bg-white p-4">
      <h2 className="font-display text-lg">Update booking status</h2>
      <Alert variant="warning">
        Status changes are validated server-side. Confirmed tickets cannot be faked from
        admin. TICKETING_PENDING awaits supplier confirmation.
      </Alert>
      {allowedTransitions.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No transitions available.</p>
      ) : (
        <>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          >
            {allowedTransitions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={busy || !status}>
            {busy ? "Updating…" : "Apply transition"}
          </Button>
        </>
      )}
      {error ? <Alert variant="error">{error}</Alert> : null}
    </form>
  );
}

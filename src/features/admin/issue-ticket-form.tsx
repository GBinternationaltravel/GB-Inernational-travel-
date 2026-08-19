"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function IssueTicketForm({
  bookingReference,
  issuerMode,
}: {
  bookingReference: string;
  issuerMode: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{
    pnr: string;
    ticketNumbers?: string[];
    notes?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOk(null);
    const form = new FormData(event.currentTarget);
    const pnr = String(form.get("pnr") ?? "");
    const ticketRaw = String(form.get("ticketNumbers") ?? "");
    const notes = String(form.get("notes") ?? "");
    const ticketNumbers = ticketRaw
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    setPendingPayload({
      pnr,
      ticketNumbers: ticketNumbers.length ? ticketNumbers : undefined,
      notes: notes || undefined,
    });
    setConfirmOpen(true);
  }

  async function confirmIssue() {
    if (!pendingPayload) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const response = await fetch(
        `/api/admin/bookings/${encodeURIComponent(bookingReference)}/issue-ticket`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingPayload),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        pnr?: string;
        mode?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Could not issue ticket.");
        setBusy(false);
        setConfirmOpen(false);
        return;
      }
      setOk(
        `Ticket issued (${data.mode}). PNR ${data.pnr} recorded. Customer email queued.`,
      );
      setConfirmOpen(false);
      setPendingPayload(null);
      router.refresh();
    } catch {
      setError("Could not issue ticket.");
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-gold)] bg-white p-4 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-lg font-semibold text-[var(--color-navy)]">Issue Ticket</h2>
        <Alert variant="info">
          Workflow: Booking → Payment verified → Issue ticket → Confirm → Ticket issued.
          Issuer mode: <strong>{issuerMode}</strong>. Enter the real PNR/ticket reference from
          your ticketing desk or sandbox.
        </Alert>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">PNR / booking locator</span>
          <input
            name="pnr"
            required
            minLength={5}
            maxLength={12}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 font-mono uppercase"
            placeholder="ABC123"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Ticket numbers (optional, comma-separated)</span>
          <input
            name="ticketNumbers"
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 font-mono"
            placeholder="157-1234567890"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Notes (optional)</span>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
          />
        </label>
        <Button type="submit" disabled={busy || issuerMode === "LIVE"}>
          Issue Ticket
        </Button>
        {issuerMode === "LIVE" ? (
          <Alert variant="warning">
            LIVE mode requires supplier credentials. Switch Settings → ticket issuer mode to
            MANUAL, SANDBOX, or MOCK to test the full workflow.
          </Alert>
        ) : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
        {ok ? <Alert variant="success">{ok}</Alert> : null}
      </form>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!busy) {
            setConfirmOpen(false);
            setPendingPayload(null);
          }
        }}
        title="Confirm ticket issuance"
      >
        <p className="text-sm text-[var(--color-muted)]">
          Issue ticket for booking <strong>{bookingReference}</strong>
          {pendingPayload?.pnr ? (
            <>
              {" "}
              with PNR <strong className="font-mono">{pendingPayload.pnr}</strong>
            </>
          ) : null}
          ? This records the ticket on the booking and notifies the customer.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setConfirmOpen(false);
              setPendingPayload(null);
            }}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void confirmIssue()} isLoading={busy}>
            Confirm & Issue
          </Button>
        </div>
      </Modal>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  clearTourInquiryDraft,
  loadTourInquiryDraft,
  type TourInquiryDraft,
} from "@/features/tours/tour-inquiry-forms";

export function TourReviewClient({
  tourSlug,
  tourName,
  price,
  currency,
}: {
  tourSlug: string;
  tourName: string;
  price: number;
  currency: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<TourInquiryDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(loadTourInquiryDraft(tourSlug));
  }, [tourSlug]);

  async function submitInquiry() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/tours/${tourSlug}/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          travelerName: draft.travelerName,
          travelerEmail: draft.travelerEmail,
          travelerPhone: draft.travelerPhone || undefined,
          travelersCount: draft.travelersCount,
          preferredDates: draft.preferredDates || undefined,
          message: draft.message || undefined,
        }),
      });
      const data = (await response.json()) as { error?: string; reference?: string };
      if (!response.ok || !data.reference) {
        setError(data.error ?? "Could not record inquiry.");
        setBusy(false);
        return;
      }
      clearTourInquiryDraft();
      router.push(
        `/tours/${tourSlug}/confirmation?ref=${encodeURIComponent(data.reference)}`,
      );
    } catch {
      setError("Could not record inquiry.");
      setBusy(false);
    }
  }

  if (!draft) {
    return (
      <Alert variant="warning" title="Traveler details missing">
        Please{" "}
        <Link href={`/tours/${tourSlug}/book`} className="text-[var(--color-brand)]">
          enter traveler details
        </Link>{" "}
        before reviewing.
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-[var(--color-border)] bg-white p-5">
      <h2 className="font-display text-xl">Review request</h2>
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-[var(--color-muted)]">Package</dt>
          <dd className="font-medium">{tourName}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-muted)]">Estimate</dt>
          <dd className="font-medium">
            {price.toLocaleString()} {currency}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-muted)]">Traveler</dt>
          <dd className="font-medium">{draft.travelerName}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-muted)]">Email</dt>
          <dd className="font-medium">{draft.travelerEmail}</dd>
        </div>
        {draft.travelerPhone ? (
          <div>
            <dt className="text-[var(--color-muted)]">Phone</dt>
            <dd className="font-medium">{draft.travelerPhone}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[var(--color-muted)]">Travelers</dt>
          <dd className="font-medium">{draft.travelersCount}</dd>
        </div>
        {draft.preferredDates ? (
          <div>
            <dt className="text-[var(--color-muted)]">Preferred dates</dt>
            <dd className="font-medium">{draft.preferredDates}</dd>
          </div>
        ) : null}
        {draft.message ? (
          <div>
            <dt className="text-[var(--color-muted)]">Message</dt>
            <dd className="font-medium whitespace-pre-wrap">{draft.message}</dd>
          </div>
        ) : null}
      </dl>

      <Alert variant="info" title="No live inventory hold">
        Submitting records an inquiry request only. Confirmation of dates and pricing follows
        by email or phone.
      </Alert>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void submitInquiry()} disabled={busy}>
          {busy ? "Submitting…" : "Submit inquiry"}
        </Button>
        <Link
          href={`/tours/${tourSlug}/book`}
          className="inline-flex h-11 items-center rounded-md border border-[var(--color-border)] px-4 text-sm"
        >
          Edit details
        </Link>
      </div>
    </div>
  );
}

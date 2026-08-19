"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "gb-tour-inquiry-draft";

export type TourInquiryDraft = {
  tourSlug: string;
  travelerName: string;
  travelerEmail: string;
  travelerPhone: string;
  travelersCount: number;
  preferredDates: string;
  message: string;
};

export function saveTourInquiryDraft(draft: TourInquiryDraft) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function loadTourInquiryDraft(tourSlug: string): TourInquiryDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TourInquiryDraft;
    if (parsed.tourSlug !== tourSlug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTourInquiryDraft() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function TourBookForm({
  tourSlug,
  tourName,
}: {
  tourSlug: string;
  tourName: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<TourInquiryDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(loadTourInquiryDraft(tourSlug));
    setReady(true);
  }, [tourSlug]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const travelerName = String(form.get("travelerName") ?? "").trim();
    const travelerEmail = String(form.get("travelerEmail") ?? "").trim();
    const travelerPhone = String(form.get("travelerPhone") ?? "").trim();
    const travelersCount = Number(form.get("travelersCount") ?? "1");
    const preferredDates = String(form.get("preferredDates") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    if (travelerName.length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!travelerEmail.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (!Number.isFinite(travelersCount) || travelersCount < 1) {
      setError("Travelers count must be at least 1.");
      return;
    }

    saveTourInquiryDraft({
      tourSlug,
      travelerName,
      travelerEmail,
      travelerPhone,
      travelersCount,
      preferredDates,
      message,
    });
    router.push(`/tours/${tourSlug}/review`);
  }

  if (!ready) {
    return <p className="text-sm text-[var(--color-muted)]">Loading form…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        Requesting <span className="font-medium text-[var(--color-ink)]">{tourName}</span>
      </p>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-muted)]">Full name</span>
        <Input name="travelerName" required defaultValue={draft?.travelerName ?? ""} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-muted)]">Email</span>
        <Input
          name="travelerEmail"
          type="email"
          required
          defaultValue={draft?.travelerEmail ?? ""}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-muted)]">Phone</span>
        <Input name="travelerPhone" defaultValue={draft?.travelerPhone ?? ""} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-muted)]">Travelers</span>
        <Input
          name="travelersCount"
          type="number"
          min={1}
          max={50}
          required
          defaultValue={draft?.travelersCount ?? 1}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-muted)]">Preferred dates</span>
        <Input
          name="preferredDates"
          placeholder="e.g. 10–15 Sep 2026"
          defaultValue={draft?.preferredDates ?? ""}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--color-muted)]">Message</span>
        <textarea
          name="message"
          rows={4}
          defaultValue={draft?.message ?? ""}
          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
        />
      </label>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Button type="submit">Continue to review</Button>
    </form>
  );
}

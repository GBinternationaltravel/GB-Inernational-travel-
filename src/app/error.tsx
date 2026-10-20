"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[page]", error.digest ?? "failed");
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h1 className="font-display text-4xl text-[var(--color-navy)]">Something went wrong</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
        This page could not be shown. Please try again, or contact GB International Travel on
        WhatsApp or by phone. Nothing on this screen is a confirmed booking.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex h-11 items-center rounded-md bg-[var(--color-navy)] px-4 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}

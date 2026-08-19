"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookingProgress } from "@/features/booking/booking-progress";
import { PassengerDetailsForm } from "@/features/booking/passenger-details-form";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import {
  readSelectedFlight,
  type SelectedFlightState,
} from "@/lib/flights/selection";

export function PassengerDetailsClient() {
  const [selection, setSelection] = useState<SelectedFlightState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSelection(readSelectedFlight());
    setReady(true);
  }, []);

  if (!ready) {
    return <LoadingState label="Loading passenger form…" />;
  }

  if (!selection) {
    return (
      <Section>
        <EmptyState
          title="Your selected flight is no longer available in this browser session."
          description="Please search again and select a flight to continue."
          action={
            <Link
              href="/flights"
              className="inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
            >
              Return to Flight Search
            </Link>
          }
        />
      </Section>
    );
  }

  return (
    <div className="pb-10">
      <Container className="py-6">
        <BookingProgress current="passenger" />
        <div className="mt-6 mb-4">
          <h1 className="font-display text-3xl text-[var(--color-ink)]">Passenger Details</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Enter traveler information exactly as it appears on the passport.
          </p>
        </div>
        <PassengerDetailsForm selection={selection} />
      </Container>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listUserTrips } from "@/services/trip-service";
import { Container } from "@/components/ui/container";
import { TripCard } from "@/features/account/trip-card";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "My Trips",
    description: "View your upcoming and past trips.",
    path: "/my-trips",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default async function MyTripsPage() {
  const user = await requireUser("/my-trips");
  const trips = await listUserTrips(user.id);
  const cancelled = [...trips.upcoming, ...trips.past].filter(
    (trip) => trip.status === "CANCELLED",
  );

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-navy)]">My Trips</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Manage upcoming, completed and cancelled bookings linked to your account.
          </p>
        </div>
        <div className="flex gap-3 text-sm font-semibold">
          <Link href="/my-trips/upcoming" className="text-[var(--color-sky)]">
            Upcoming
          </Link>
          <Link href="/my-trips/past" className="text-[var(--color-sky)]">
            Past
          </Link>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-[var(--color-navy)]">Upcoming Trips</h2>
        <div className="mt-4 space-y-4">
          {trips.upcoming.filter((t) => t.status !== "CANCELLED").length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-white p-6">
              <p className="font-semibold text-[var(--color-navy)]">
                You don&apos;t have any trips yet.
              </p>
              <Link
                href="/flights"
                className="mt-3 inline-flex text-sm font-semibold text-[var(--color-emerald)]"
              >
                Book a Flight
              </Link>
            </div>
          ) : (
            trips.upcoming
              .filter((t) => t.status !== "CANCELLED")
              .map((trip) => <TripCard key={trip.reference} trip={trip} />)
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-[var(--color-navy)]">Completed Trips</h2>
        <div className="mt-4 space-y-4">
          {trips.past.filter((t) => t.status !== "CANCELLED").length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              You haven&apos;t completed any trips yet.
            </p>
          ) : (
            trips.past
              .filter((t) => t.status !== "CANCELLED")
              .slice(0, 5)
              .map((trip) => <TripCard key={trip.reference} trip={trip} />)
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-[var(--color-navy)]">Cancelled Trips</h2>
        <div className="mt-4 space-y-4">
          {cancelled.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No cancelled bookings.</p>
          ) : (
            cancelled.map((trip) => <TripCard key={trip.reference} trip={trip} />)
          )}
        </div>
      </section>
    </Container>
  );
}

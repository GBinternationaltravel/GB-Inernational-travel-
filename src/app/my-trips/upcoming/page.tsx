import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listUserTrips } from "@/services/trip-service";
import { Container } from "@/components/ui/container";
import { TripCard } from "@/features/account/trip-card";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Upcoming Trips",
    path: "/my-trips/upcoming",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default async function UpcomingTripsPage() {
  const user = await requireUser("/my-trips/upcoming");
  const trips = await listUserTrips(user.id);

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl">Upcoming Trips</h1>
      <div className="mt-6 space-y-4">
        {trips.upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6">
            <p className="font-medium">You don&apos;t have any trips yet.</p>
            <Link href="/flights" className="mt-3 inline-flex text-sm text-[var(--color-brand)]">
              Search Flights
            </Link>
          </div>
        ) : (
          trips.upcoming.map((trip) => <TripCard key={trip.reference} trip={trip} />)
        )}
      </div>
    </Container>
  );
}

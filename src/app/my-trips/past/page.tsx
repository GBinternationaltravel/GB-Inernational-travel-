import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { listUserTrips } from "@/services/trip-service";
import { Container } from "@/components/ui/container";
import { TripCard } from "@/features/account/trip-card";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Past Trips",
    path: "/my-trips/past",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default async function PastTripsPage() {
  const user = await requireUser("/my-trips/past");
  const trips = await listUserTrips(user.id);

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl">Past Trips</h1>
      <div className="mt-6 space-y-4">
        {trips.past.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            You haven&apos;t completed any trips yet.
          </p>
        ) : (
          trips.past.map((trip) => <TripCard key={trip.reference} trip={trip} />)
        )}
      </div>
    </Container>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getPublicUser } from "@/services/user-service";
import { listUserTrips } from "@/services/trip-service";
import { Container } from "@/components/ui/container";
import { Alert } from "@/components/ui/alert";
import { TripCard } from "@/features/account/trip-card";
import { ClaimGuestBooking } from "@/features/account/claim-guest-booking";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Account",
    description: "Your GB International Travel account.",
    path: "/account",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const sessionUser = await requireUser("/account");
  const profile = await getPublicUser(sessionUser.id);
  const trips = await listUserTrips(sessionUser.id);
  const upcoming = trips.upcoming[0];

  return (
    <Container className="py-10">
      <ClaimGuestBooking />
      <h1 className="font-display text-3xl">
        Welcome back{profile?.firstName ? `, ${profile.firstName}` : ""}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{sessionUser.email}</p>

      {trips.store === "file" ? (
        <Alert variant="warning" className="mt-4">
          PostgreSQL is not connected. Account and trip data are using the local development store.
        </Alert>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Upcoming trip</h2>
          {upcoming ? (
            <TripCard trip={upcoming} />
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6">
              <p className="font-medium">You don&apos;t have any trips yet.</p>
              <Link href="/flights" className="mt-3 inline-flex text-sm text-[var(--color-brand)]">
                Search Flights
              </Link>
            </div>
          )}

          <h2 className="mt-8 font-display text-2xl">Recent bookings</h2>
          <div className="space-y-3">
            {[...trips.upcoming, ...trips.past].slice(0, 3).map((trip) => (
              <TripCard key={trip.reference} trip={trip} />
            ))}
            {[...trips.upcoming, ...trips.past].length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No bookings yet.</p>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
            <h2 className="font-display text-xl">Profile summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-muted)]">Name</dt>
                <dd>
                  {profile?.firstName} {profile?.lastName}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-muted)]">Currency</dt>
                <dd>{profile?.preferredCurrency ?? "PKR"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-muted)]">Language</dt>
                <dd>{profile?.preferredLanguage ?? "en"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
            <h2 className="font-display text-xl">Quick actions</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/flights" className="text-[var(--color-brand)]">
                  Search Flights
                </Link>
              </li>
              <li>
                <Link href="/my-trips" className="text-[var(--color-brand)]">
                  My Trips
                </Link>
              </li>
              <li>
                <Link href="/account/notifications" className="text-[var(--color-brand)]">
                  Notifications
                </Link>
              </li>
              <li>
                <Link href="/account/profile" className="text-[var(--color-brand)]">
                  Account Settings
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-[var(--color-brand)]">
                  Contact Support
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </Container>
  );
}

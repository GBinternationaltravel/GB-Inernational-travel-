import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listNotificationsForUser } from "@/lib/notifications/notification-store";
import { Container } from "@/components/ui/container";
import { Alert } from "@/components/ui/alert";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  MarkAllNotificationsReadButton,
  MarkNotificationReadButton,
} from "@/features/account/notification-actions";
import { formatFlightDate, formatFlightTime } from "@/lib/flights/filter-sort";
import { resolveDataStoreStatus } from "@/lib/data-store";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Notifications",
    description: "Your GB International Travel notification center.",
    path: "/account/notifications",
    noIndex: true,
  }),
  robots: { index: false, follow: false },
};

type SearchParams = { searchParams: Promise<{ page?: string; unread?: string }> };

const PAGE_SIZE = 20;

const categoryLabels: Record<string, string> = {
  payment: "Payment",
  booking: "Booking",
  ticketing: "Ticketing",
  weather: "Weather",
  "flight-status": "Flight status",
  reminder: "Travel reminder",
  general: "Update",
};

export default async function AccountNotificationsPage({ searchParams }: SearchParams) {
  const user = await requireUser("/account/notifications");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const unreadOnly = params.unread === "1";
  const offset = (page - 1) * PAGE_SIZE;

  const [result, store] = await Promise.all([
    listNotificationsForUser(user.id, {
      limit: PAGE_SIZE,
      offset,
      unreadOnly,
    }),
    resolveDataStoreStatus(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <Container className="py-8 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Notifications</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Payment, booking, ticketing, weather, flight-status, and travel reminders.
            Sensitive payment and passport details are never shown here.
          </p>
        </div>
        <MarkAllNotificationsReadButton disabled={result.unreadCount === 0} />
      </div>

      {store.warning ? (
        <Alert variant="warning" className="mt-4">
          {store.warning}
        </Alert>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-[var(--color-muted)]">
          {result.unreadCount} unread · {result.total} shown filter
        </span>
        <Link
          href="/account/notifications"
          className={!unreadOnly ? "font-medium text-[var(--color-brand)]" : "text-[var(--color-muted)]"}
        >
          All
        </Link>
        <Link
          href="/account/notifications?unread=1"
          className={unreadOnly ? "font-medium text-[var(--color-brand)]" : "text-[var(--color-muted)]"}
        >
          Unread
        </Link>
        <Link href="/account/profile" className="text-[var(--color-brand)]">
          Notification preferences
        </Link>
      </div>

      <ul className="mt-6 space-y-3">
        {result.items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted)]">
            No notifications yet. Updates for your bookings will appear here.
          </li>
        ) : (
          result.items.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl border border-[var(--color-border)] bg-white p-4 ${
                item.unread ? "border-l-4 border-l-[var(--color-brand)]" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                    {categoryLabels[item.category] ?? "Update"}
                    {item.bookingReference ? ` · ${item.bookingReference}` : ""}
                  </p>
                  <h2 className="mt-1 font-medium">{item.subject}</h2>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">{item.summary}</p>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    {formatFlightDate(item.createdAt)} {formatFlightTime(item.createdAt)}
                    {item.status !== "SENT" ? ` · ${item.status}` : ""}
                  </p>
                </div>
                <MarkNotificationReadButton
                  notificationId={item.id}
                  unread={item.unread}
                />
              </div>
              {item.bookingReference ? (
                <Link
                  href={`/my-trips/${encodeURIComponent(item.bookingReference)}`}
                  className="mt-3 inline-flex text-sm text-[var(--color-brand)]"
                >
                  View trip
                </Link>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {totalPages > 1 ? (
        <nav className="mt-8 flex flex-wrap gap-3 text-sm">
          {page > 1 ? (
            <Link
              href={`/account/notifications?page=${page - 1}${unreadOnly ? "&unread=1" : ""}`}
              className="text-[var(--color-brand)]"
            >
              Previous
            </Link>
          ) : null}
          <span className="text-[var(--color-muted)]">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/account/notifications?page=${page + 1}${unreadOnly ? "&unread=1" : ""}`}
              className="text-[var(--color-brand)]"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </Container>
  );
}

import Link from "next/link";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { formatFlightDate, formatPrice } from "@/lib/flights/filter-sort";
import type { AdminBookingListItem } from "@/services/admin-booking-service";

export function AdminBookingsTable({
  items,
}: {
  items: AdminBookingListItem[];
}) {
  if (!items.length) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] bg-white p-6 text-sm text-[var(--color-muted)]">
        No bookings found.
      </p>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">Booking</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Route</th>
              <th className="px-3 py-2">Travel</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.reference} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2 font-medium">{item.reference}</td>
                <td className="px-3 py-2">
                  <div>{item.customerName}</div>
                  <div className="text-xs text-[var(--color-muted)]">{item.customerEmail}</div>
                </td>
                <td className="px-3 py-2">{item.route}</td>
                <td className="px-3 py-2">
                  {item.travelDate ? formatFlightDate(item.travelDate) : "—"}
                </td>
                <td className="px-3 py-2">{formatPrice(item.amount, item.currency)}</td>
                <td className="px-3 py-2">{item.paymentStatus}</td>
                <td className="px-3 py-2">
                  <BookingStatusBadge status={item.bookingStatus} />
                </td>
                <td className="px-3 py-2">{formatFlightDate(item.createdAt)}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/bookings/${encodeURIComponent(item.reference)}`}
                    className="text-[var(--color-brand)]"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <article
            key={item.reference}
            className="rounded-xl border border-[var(--color-border)] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.reference}</p>
                <p className="text-sm text-[var(--color-muted)]">{item.route}</p>
              </div>
              <BookingStatusBadge status={item.bookingStatus} />
            </div>
            <p className="mt-2 text-sm">{item.customerName}</p>
            <p className="text-sm">{formatPrice(item.amount, item.currency)}</p>
            <Link
              href={`/admin/bookings/${encodeURIComponent(item.reference)}`}
              className="mt-3 inline-flex text-sm text-[var(--color-brand)]"
            >
              View
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}

export function AdminPagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  function href(nextPage: number) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    search.set("page", String(nextPage));
    return `${basePath}?${search.toString()}`;
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="text-[var(--color-muted)]">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="rounded-md border px-3 py-1.5">
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={href(page + 1)} className="rounded-md border px-3 py-1.5">
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

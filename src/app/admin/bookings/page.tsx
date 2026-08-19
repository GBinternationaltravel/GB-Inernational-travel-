import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminBookings } from "@/services/admin-booking-service";
import { adminBookingStatuses, adminPaymentStatuses } from "@/config/admin";
import { AdminStoreBanner } from "@/features/admin/admin-ui";
import { AdminBookingsTable, AdminPagination } from "@/features/admin/admin-tables";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdminPage("/admin/bookings");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const bookingStatus = one(params.bookingStatus);
  const paymentStatus = one(params.paymentStatus);
  const travelFrom = one(params.travelFrom);
  const travelTo = one(params.travelTo);
  const createdFrom = one(params.createdFrom);
  const createdTo = one(params.createdTo);
  const sort = (one(params.sort) as
    | "created_desc"
    | "created_asc"
    | "travel_asc"
    | "travel_desc"
    | "amount_desc"
    | undefined) ?? "created_desc";
  const page = Number(one(params.page) ?? "1") || 1;

  const data = await listAdminBookings(admin.id, {
    page,
    query,
    bookingStatus,
    paymentStatus,
    travelFrom,
    travelTo,
    createdFrom,
    createdTo,
    sort,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Bookings</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Server-side search, filters, and pagination.
        </p>
      </div>
      <AdminStoreBanner developmentDataStore={data.developmentDataStore} />

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Reference, email, passenger"
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm md:col-span-2"
        />
        <select
          name="bookingStatus"
          defaultValue={bookingStatus ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="">All booking statuses</option>
          {adminBookingStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          name="paymentStatus"
          defaultValue={paymentStatus ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="">All payment statuses</option>
          {adminPaymentStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="travelFrom"
          defaultValue={travelFrom ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        />
        <input
          type="date"
          name="travelTo"
          defaultValue={travelTo ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        />
        <input
          type="date"
          name="createdFrom"
          defaultValue={createdFrom ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        />
        <input
          type="date"
          name="createdTo"
          defaultValue={createdTo ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="created_desc">Newest created</option>
          <option value="created_asc">Oldest created</option>
          <option value="travel_asc">Travel date ↑</option>
          <option value="travel_desc">Travel date ↓</option>
          <option value="amount_desc">Amount ↓</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
        >
          Apply
        </button>
      </form>

      <AdminBookingsTable items={data.items} />
      <AdminPagination
        page={data.page}
        totalPages={data.totalPages}
        basePath="/admin/bookings"
        params={{
          query,
          bookingStatus,
          paymentStatus,
          travelFrom,
          travelTo,
          createdFrom,
          createdTo,
          sort,
        }}
      />
    </div>
  );
}

import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminCustomers } from "@/services/admin-customer-service";
import { AdminStoreBanner } from "@/features/admin/admin-ui";
import { AdminPagination } from "@/features/admin/admin-tables";
import { formatFlightDate } from "@/lib/flights/filter-sort";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdminPage("/admin/customers");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const status = (one(params.status) as "active" | "disabled" | "all" | undefined) ?? "all";
  const page = Number(one(params.page) ?? "1") || 1;

  const data = await listAdminCustomers(admin.id, { page, query, status });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Customers</h1>
        <p className="text-sm text-[var(--color-muted)]">Searchable customer accounts.</p>
      </div>
      <AdminStoreBanner developmentDataStore={data.developmentDataStore} />

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Name, email, phone"
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm md:col-span-2"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Bookings</th>
              <th className="px-3 py-2">Recent</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2 font-medium">{item.name}</td>
                <td className="px-3 py-2">{item.email}</td>
                <td className="px-3 py-2">{item.phone}</td>
                <td className="px-3 py-2">{formatFlightDate(item.createdAt)}</td>
                <td className="px-3 py-2">{item.bookingCount}</td>
                <td className="px-3 py-2">{item.recentBooking ?? "—"}</td>
                <td className="px-3 py-2">{item.accountStatus}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/customers/${item.id}`} className="text-[var(--color-brand)]">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {data.items.map((item) => (
          <article key={item.id} className="rounded-xl border border-[var(--color-border)] bg-white p-4">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-[var(--color-muted)]">{item.email}</p>
            <p className="mt-1 text-sm">{item.accountStatus} · {item.bookingCount} bookings</p>
            <Link href={`/admin/customers/${item.id}`} className="mt-2 inline-flex text-sm text-[var(--color-brand)]">
              View
            </Link>
          </article>
        ))}
      </div>

      <AdminPagination
        page={data.page}
        totalPages={data.totalPages}
        basePath="/admin/customers"
        params={{ query, status }}
      />
    </div>
  );
}

import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminPayments } from "@/services/admin-payment-service";
import { adminPaymentStatuses } from "@/config/admin";
import { AdminStoreBanner } from "@/features/admin/admin-ui";
import { AdminPagination } from "@/features/admin/admin-tables";
import { Alert } from "@/components/ui/alert";
import { formatFlightDate, formatPrice } from "@/lib/flights/filter-sort";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdminPage("/admin/payments");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const status = one(params.status);
  const page = Number(one(params.page) ?? "1") || 1;

  const data = await listAdminPayments(admin.id, { page, query, status });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Payments</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Payment operations overview. Card numbers and secrets are never shown.
        </p>
      </div>
      <AdminStoreBanner developmentDataStore={data.developmentDataStore} />
      <Alert variant="info">
        Refunds will be available after production payment integration.
      </Alert>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Payment ID, booking, customer"
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm md:col-span-2"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="">All statuses</option>
          {adminPaymentStatuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
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
              <th className="px-3 py-2">Payment ID</th>
              <th className="px-3 py-2">Booking</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2 font-mono text-xs">{item.id.slice(0, 12)}…</td>
                <td className="px-3 py-2">{item.bookingReference}</td>
                <td className="px-3 py-2">{item.customer}</td>
                <td className="px-3 py-2">
                  {item.provider}
                  {item.isMock ? " (mock)" : ""}
                </td>
                <td className="px-3 py-2">{formatPrice(item.amount, item.currency)}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{formatFlightDate(item.createdAt)}</td>
                <td className="px-3 py-2">{formatFlightDate(item.updatedAt)}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/payments/${item.id}`} className="text-[var(--color-brand)]">
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
            <p className="font-medium">{item.bookingReference}</p>
            <p className="text-sm text-[var(--color-muted)]">
              {item.status} · {formatPrice(item.amount, item.currency)}
            </p>
            <Link href={`/admin/payments/${item.id}`} className="mt-2 inline-flex text-sm text-[var(--color-brand)]">
              View
            </Link>
          </article>
        ))}
      </div>

      <AdminPagination
        page={data.page}
        totalPages={data.totalPages}
        basePath="/admin/payments"
        params={{ query, status }}
      />
    </div>
  );
}

import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminStoreBanner, MetricCard } from "@/features/admin/admin-ui";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPrice } from "@/lib/flights/filter-sort";
import { getAdminReportSummary } from "@/services/admin-report-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const exportTypes = [
  { type: "bookings", label: "Bookings CSV" },
  { type: "payments", label: "Payments CSV" },
  { type: "tickets", label: "Tickets CSV" },
  { type: "refunds", label: "Refunds CSV" },
  { type: "cancellations", label: "Cancellations CSV" },
  { type: "airline-sales", label: "Airline sales CSV" },
  { type: "destination-sales", label: "Destination sales CSV" },
] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdminPage("/admin/reports", {
    permissions: "reports.view",
  });
  const params = await searchParams;
  const dateFrom = one(params.dateFrom) ?? "";
  const dateTo = one(params.dateTo) ?? "";
  const query = one(params.query) ?? "";

  const data = await getAdminReportSummary(admin.id, { dateFrom, dateTo, query });
  const { summary } = data;
  const qs = new URLSearchParams();
  if (dateFrom) qs.set("dateFrom", dateFrom);
  if (dateTo) qs.set("dateTo", dateTo);
  if (query) qs.set("query", query);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Reports</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Metrics from stored bookings and payments only — no invented revenue.
        </p>
      </div>

      <AdminStoreBanner developmentDataStore={data.developmentDataStore} />

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-[var(--color-muted)]">From</span>
          <input
            type="date"
            name="dateFrom"
            defaultValue={dateFrom}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--color-muted)]">To</span>
          <input
            type="date"
            name="dateTo"
            defaultValue={dateTo}
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
        </label>
        <label className="text-sm md:col-span-1">
          <span className="mb-1 block text-[var(--color-muted)]">Search</span>
          <input
            name="query"
            defaultValue={query}
            placeholder="Ref, email, airline, city"
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="h-10 w-full rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
          >
            Apply filters
          </button>
        </div>
      </form>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Bookings" value={summary.bookings} />
        <MetricCard label="Tickets" value={summary.tickets} />
        <MetricCard label="Payments" value={summary.payments} />
        <MetricCard label="Cancellations" value={summary.cancellations} />
        <MetricCard label="Refunds" value={summary.refunds} />
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
            Revenue (paid / captured)
          </p>
          <p className="mt-2 font-display text-3xl">
            {formatPrice(summary.revenue, summary.currency)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
            Refund amount
          </p>
          <p className="mt-2 font-display text-3xl">
            {formatPrice(summary.refundAmount, summary.currency)}
          </p>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {exportTypes.map((item) => {
          const href = `/api/admin/reports/export?type=${item.type}${qs.toString() ? `&${qs}` : ""}`;
          return (
            <Link
              key={item.type}
              href={href}
              className="inline-flex h-9 items-center rounded-md border border-[var(--color-border)] bg-white px-3 text-sm hover:border-[var(--color-brand)]"
            >
              {item.label}
            </Link>
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SalesTable
          title="Airline sales"
          empty="No airline sales in this range."
          rows={summary.airlineSales.map((r) => ({
            key: r.airline,
            label: r.airline,
            bookings: r.bookings,
            revenue: r.revenue,
            currency: summary.currency,
          }))}
        />
        <SalesTable
          title="Destination sales"
          empty="No destination sales in this range."
          rows={summary.destinationSales.map((r) => ({
            key: r.destination,
            label: r.destination,
            bookings: r.bookings,
            revenue: r.revenue,
            currency: summary.currency,
          }))}
        />
      </div>
    </div>
  );
}

function SalesTable({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{
    key: string;
    label: string;
    bookings: number;
    revenue: number;
    currency: string;
  }>;
}) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-white p-4">
      <h2 className="font-display text-xl">{title}</h2>
      {rows.length === 0 ? (
        <EmptyState title={empty} className="mt-3 border-0 bg-transparent py-6" />
      ) : (
        <>
          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Bookings</th>
                  <th className="py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 25).map((row) => (
                  <tr key={row.key} className="border-b border-[var(--color-border)]">
                    <td className="py-2 pr-3">{row.label}</td>
                    <td className="py-2 pr-3">{row.bookings}</td>
                    <td className="py-2">{formatPrice(row.revenue, row.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 space-y-2 md:hidden">
            {rows.slice(0, 25).map((row) => (
              <article
                key={row.key}
                className="rounded-lg border border-[var(--color-border)] p-3 text-sm"
              >
                <p className="font-medium">{row.label}</p>
                <p className="text-[var(--color-muted)]">
                  {row.bookings} bookings · {formatPrice(row.revenue, row.currency)}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

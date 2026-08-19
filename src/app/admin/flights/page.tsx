import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminPagination } from "@/features/admin/admin-tables";
import { formatFlightDate } from "@/lib/flights/filter-sort";
import { listAdminFlights } from "@/services/admin-cms-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FLIGHT_STATUSES = [
  "SCHEDULED",
  "BOARDING",
  "DELAYED",
  "DEPARTED",
  "ARRIVED",
  "CANCELLED",
] as const;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminFlightsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/flights");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const status = one(params.status) ?? "";
  const page = Number(one(params.page) ?? "1") || 1;

  const data = await listAdminFlights({
    page,
    query,
    status: status || undefined,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Flights</h1>
        <p className="text-sm text-[var(--color-muted)]">
          View inventory flights and update operational status.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Flight number or airline"
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm md:col-span-2"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="">All statuses</option>
          {FLIGHT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
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

      {data.items.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-border)] bg-white p-6 text-sm text-[var(--color-muted)]">
          No flights found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">Flight</th>
                <th className="px-3 py-2">Airline</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const first = item.segments[0];
                const last = item.segments[item.segments.length - 1];
                const route =
                  first && last
                    ? `${first.originAirport.iataCode} → ${last.destinationAirport.iataCode}`
                    : "—";
                return (
                  <tr key={item.id} className="border-b border-[var(--color-border)]">
                    <td className="px-3 py-2 font-medium">{item.flightNumber}</td>
                    <td className="px-3 py-2">
                      {item.airline.iataCode} · {item.airline.name}
                    </td>
                    <td className="px-3 py-2">{route}</td>
                    <td className="px-3 py-2">{item.status}</td>
                    <td className="px-3 py-2">{formatFlightDate(item.updatedAt.toISOString())}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/flights/${item.id}`}
                        className="text-[var(--color-brand)]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination
        page={data.page}
        totalPages={data.pageCount}
        basePath="/admin/flights"
        params={{ query, status: status || undefined }}
      />
    </div>
  );
}

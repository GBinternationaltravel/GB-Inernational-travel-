import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminPassengers } from "@/services/admin-payment-service";
import { AdminStoreBanner } from "@/features/admin/admin-ui";
import { AdminPagination } from "@/features/admin/admin-tables";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPassengersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdminPage("/admin/passengers");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const page = Number(one(params.page) ?? "1") || 1;
  const data = await listAdminPassengers(admin.id, { page, query });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Passengers</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Minimal searchable view. Passport numbers are not listed here.
        </p>
      </div>
      <AdminStoreBanner developmentDataStore={data.developmentDataStore} />
      <Alert variant="warning">
        Passenger data is sensitive. Use booking detail for masked document endings only.
      </Alert>

      <form className="flex flex-wrap gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Name, booking, nationality"
          className="h-10 min-w-[220px] flex-1 rounded-md border border-[var(--color-border)] px-3 text-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Nationality</th>
              <th className="px-3 py-2">Booking</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={`${item.id}-${item.bookingReference}`} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2">{item.type}</td>
                <td className="px-3 py-2">{item.nationality}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/bookings/${encodeURIComponent(item.bookingReference)}`}
                    className="text-[var(--color-brand)]"
                  >
                    {item.bookingReference}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={data.page}
        totalPages={data.totalPages}
        basePath="/admin/passengers"
        params={{ query }}
      />
    </div>
  );
}

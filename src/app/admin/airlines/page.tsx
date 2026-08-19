import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { airlines } from "@/data/airlines";
import { AdminPagination } from "@/features/admin/admin-tables";
import { CmsEntityForm, CmsToggleButton } from "@/features/admin/cms-form";
import {
  listAdminAirlines,
  seedAirlinesIfEmpty,
} from "@/services/admin-cms-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAirlinesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/airlines");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const active = (one(params.active) as "all" | "active" | "inactive" | undefined) ?? "all";
  const page = Number(one(params.page) ?? "1") || 1;
  const editId = one(params.edit);

  let data = await listAdminAirlines({ page, query, active });
  if (data.total === 0 && !query && active === "all") {
    await seedAirlinesIfEmpty(
      airlines.map((a) => ({ iataCode: a.iataCode, name: a.name })),
    );
    data = await listAdminAirlines({ page, query, active });
  }

  const editing = editId ? data.items.find((item) => item.id === editId) : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Airlines</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Manage airline catalog used across inventory and deals.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Name or IATA/ICAO"
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm md:col-span-2"
        />
        <select
          name="active"
          defaultValue={active}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>

      {editing ? (
        <CmsEntityForm
          title={`Edit ${editing.name}`}
          endpoint={`/api/admin/airlines/${editing.id}`}
          method="PATCH"
          submitLabel="Update airline"
          fields={[
            { name: "iataCode", label: "IATA code", defaultValue: editing.iataCode, required: true },
            { name: "icaoCode", label: "ICAO code", defaultValue: editing.icaoCode ?? "" },
            { name: "name", label: "Name", defaultValue: editing.name, required: true },
            { name: "countryCode", label: "Country code", defaultValue: editing.countryCode ?? "" },
            { name: "logoUrl", label: "Logo URL", type: "url", defaultValue: editing.logoUrl ?? "" },
            {
              name: "isActive",
              label: "Active",
              type: "select",
              defaultValue: editing.isActive,
              options: [
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ],
            },
          ]}
        />
      ) : (
        <CmsEntityForm
          title="Add airline"
          endpoint="/api/admin/airlines"
          method="POST"
          submitLabel="Create airline"
          fields={[
            { name: "iataCode", label: "IATA code", required: true, placeholder: "PK" },
            { name: "icaoCode", label: "ICAO code", placeholder: "PIA" },
            { name: "name", label: "Name", required: true },
            { name: "countryCode", label: "Country code", placeholder: "PK" },
            { name: "logoUrl", label: "Logo URL", type: "url" },
            {
              name: "isActive",
              label: "Active",
              type: "select",
              defaultValue: true,
              options: [
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ],
            },
          ]}
        />
      )}

      {data.items.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-border)] bg-white p-6 text-sm text-[var(--color-muted)]">
          No airlines found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)]">
                  <td className="px-3 py-2 font-medium">
                    {item.iataCode}
                    {item.icaoCode ? ` / ${item.icaoCode}` : ""}
                  </td>
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{item.countryCode ?? "—"}</td>
                  <td className="px-3 py-2">{item.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/airlines?edit=${item.id}&query=${encodeURIComponent(query)}&active=${active}&page=${page}`}
                        className="text-[var(--color-brand)]"
                      >
                        Edit
                      </Link>
                      <CmsToggleButton
                        endpoint={`/api/admin/airlines/${item.id}`}
                        payload={{ isActive: !item.isActive }}
                        label={item.isActive ? "Deactivate" : "Activate"}
                        variant={item.isActive ? "secondary" : "primary"}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination
        page={data.page}
        totalPages={data.pageCount}
        basePath="/admin/airlines"
        params={{ query, active }}
      />
    </div>
  );
}

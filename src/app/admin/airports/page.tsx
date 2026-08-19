import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminPagination } from "@/features/admin/admin-tables";
import { CmsEntityForm, CmsToggleButton } from "@/features/admin/cms-form";
import { listAdminAirports } from "@/services/admin-cms-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAirportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/airports");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const active = (one(params.active) as "all" | "active" | "inactive" | undefined) ?? "all";
  const page = Number(one(params.page) ?? "1") || 1;
  const editId = one(params.edit);

  const data = await listAdminAirports({ page, query, active });
  const editing = editId ? data.items.find((item) => item.id === editId) : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Airports</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Maintain airport codes, cities, and geo metadata.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Name, city, or IATA"
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
          endpoint={`/api/admin/airports/${editing.id}`}
          method="PATCH"
          submitLabel="Update airport"
          fields={[
            { name: "iataCode", label: "IATA code", defaultValue: editing.iataCode, required: true },
            { name: "icaoCode", label: "ICAO code", defaultValue: editing.icaoCode ?? "" },
            { name: "name", label: "Name", defaultValue: editing.name, required: true },
            {
              name: "cityName",
              label: "City",
              defaultValue: editing.city?.name ?? "",
              required: true,
            },
            {
              name: "countryCode",
              label: "Country code",
              defaultValue: editing.city?.country.code ?? "PK",
              required: true,
            },
            {
              name: "countryName",
              label: "Country name",
              defaultValue: editing.city?.country.name ?? "Pakistan",
              required: true,
            },
            { name: "timezone", label: "Timezone", defaultValue: editing.timezone ?? "" },
            {
              name: "latitude",
              label: "Latitude",
              type: "number",
              step: "any",
              defaultValue: editing.latitude != null ? Number(editing.latitude) : "",
            },
            {
              name: "longitude",
              label: "Longitude",
              type: "number",
              step: "any",
              defaultValue: editing.longitude != null ? Number(editing.longitude) : "",
            },
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
          title="Add airport"
          endpoint="/api/admin/airports"
          method="POST"
          submitLabel="Create airport"
          fields={[
            { name: "iataCode", label: "IATA code", required: true, placeholder: "KHI" },
            { name: "icaoCode", label: "ICAO code", placeholder: "OPKC" },
            { name: "name", label: "Name", required: true },
            { name: "cityName", label: "City", required: true },
            { name: "countryCode", label: "Country code", required: true, placeholder: "PK" },
            { name: "countryName", label: "Country name", required: true },
            { name: "timezone", label: "Timezone", placeholder: "Asia/Karachi" },
            { name: "latitude", label: "Latitude", type: "number", step: "any" },
            { name: "longitude", label: "Longitude", type: "number", step: "any" },
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
          No airports found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)]">
                  <td className="px-3 py-2 font-medium">{item.iataCode}</td>
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">
                    {item.city
                      ? `${item.city.name}, ${item.city.country.code}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{item.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/airports?edit=${item.id}&query=${encodeURIComponent(query)}&active=${active}&page=${page}`}
                        className="text-[var(--color-brand)]"
                      >
                        Edit
                      </Link>
                      <CmsToggleButton
                        endpoint={`/api/admin/airports/${item.id}`}
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
        basePath="/admin/airports"
        params={{ query, active }}
      />
    </div>
  );
}

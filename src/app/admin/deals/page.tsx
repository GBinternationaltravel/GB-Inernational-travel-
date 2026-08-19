import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminPagination } from "@/features/admin/admin-tables";
import { CmsEntityForm, CmsToggleButton } from "@/features/admin/cms-form";
import { listAdminDeals } from "@/services/admin-cms-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export default async function AdminDealsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/deals");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const published =
    (one(params.published) as "all" | "published" | "draft" | undefined) ?? "all";
  const page = Number(one(params.page) ?? "1") || 1;
  const editId = one(params.edit);

  const data = await listAdminDeals({ page, query, published });
  const editing = editId ? data.items.find((item) => item.id === editId) : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Deals</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Create and publish promotional fare deals.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Title, airline, or route"
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm md:col-span-2"
        />
        <select
          name="published"
          defaultValue={published}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
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
          title={`Edit ${editing.title}`}
          endpoint={`/api/admin/deals/${editing.id}`}
          method="PATCH"
          submitLabel="Update deal"
          fields={[
            { name: "title", label: "Title", defaultValue: editing.title, required: true },
            { name: "airlineCode", label: "Airline code", defaultValue: editing.airlineCode ?? "" },
            { name: "airlineName", label: "Airline name", defaultValue: editing.airlineName ?? "" },
            { name: "originCode", label: "Origin", defaultValue: editing.originCode ?? "" },
            {
              name: "destinationCode",
              label: "Destination",
              defaultValue: editing.destinationCode ?? "",
            },
            {
              name: "price",
              label: "Price",
              type: "number",
              step: "0.01",
              defaultValue: Number(editing.price),
              required: true,
            },
            {
              name: "currency",
              label: "Currency",
              defaultValue: editing.currency,
              required: true,
            },
            {
              name: "travelStart",
              label: "Travel start",
              type: "date",
              defaultValue: toDateInput(editing.travelStart),
            },
            {
              name: "travelEnd",
              label: "Travel end",
              type: "date",
              defaultValue: toDateInput(editing.travelEnd),
            },
            {
              name: "expiresAt",
              label: "Expires",
              type: "date",
              defaultValue: toDateInput(editing.expiresAt),
            },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              defaultValue: editing.description ?? "",
            },
            { name: "imageUrl", label: "Image URL", type: "url", defaultValue: editing.imageUrl ?? "" },
            {
              name: "isPublished",
              label: "Published",
              type: "select",
              defaultValue: editing.isPublished,
              options: [
                { value: "true", label: "Published" },
                { value: "false", label: "Draft" },
              ],
            },
          ]}
        />
      ) : (
        <CmsEntityForm
          title="Add deal"
          endpoint="/api/admin/deals"
          method="POST"
          submitLabel="Create deal"
          fields={[
            { name: "title", label: "Title", required: true },
            { name: "airlineCode", label: "Airline code", placeholder: "EK" },
            { name: "airlineName", label: "Airline name" },
            { name: "originCode", label: "Origin", placeholder: "KHI" },
            { name: "destinationCode", label: "Destination", placeholder: "DXB" },
            { name: "price", label: "Price", type: "number", step: "0.01", required: true },
            { name: "currency", label: "Currency", defaultValue: "PKR", required: true },
            { name: "travelStart", label: "Travel start", type: "date" },
            { name: "travelEnd", label: "Travel end", type: "date" },
            { name: "expiresAt", label: "Expires", type: "date" },
            { name: "description", label: "Description", type: "textarea" },
            { name: "imageUrl", label: "Image URL", type: "url" },
            {
              name: "isPublished",
              label: "Published",
              type: "select",
              defaultValue: false,
              options: [
                { value: "true", label: "Published" },
                { value: "false", label: "Draft" },
              ],
            },
          ]}
        />
      )}

      {data.items.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-border)] bg-white p-6 text-sm text-[var(--color-muted)]">
          No deals found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)]">
                  <td className="px-3 py-2 font-medium">{item.title}</td>
                  <td className="px-3 py-2">
                    {(item.originCode ?? "?") + " → " + (item.destinationCode ?? "?")}
                  </td>
                  <td className="px-3 py-2">
                    {Number(item.price)} {item.currency}
                  </td>
                  <td className="px-3 py-2">{item.isPublished ? "Published" : "Draft"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/deals?edit=${item.id}&query=${encodeURIComponent(query)}&published=${published}&page=${page}`}
                        className="text-[var(--color-brand)]"
                      >
                        Edit
                      </Link>
                      <CmsToggleButton
                        endpoint={`/api/admin/deals/${item.id}`}
                        payload={{ isPublished: !item.isPublished }}
                        label={item.isPublished ? "Unpublish" : "Publish"}
                        variant={item.isPublished ? "secondary" : "primary"}
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
        basePath="/admin/deals"
        params={{ query, published }}
      />
    </div>
  );
}

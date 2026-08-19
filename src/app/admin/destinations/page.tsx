import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminPagination } from "@/features/admin/admin-tables";
import { CmsEntityForm, CmsToggleButton } from "@/features/admin/cms-form";
import { listAdminDestinations } from "@/services/admin-cms-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminDestinationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/destinations");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const published =
    (one(params.published) as "all" | "published" | "draft" | undefined) ?? "all";
  const page = Number(one(params.page) ?? "1") || 1;
  const editId = one(params.edit);

  const data = await listAdminDestinations({ page, query, published });
  const editing = editId ? data.items.find((item) => item.id === editId) : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Destinations</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Curate destination pages for marketing and guides.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Title, city, or country"
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
          endpoint={`/api/admin/destinations/${editing.id}`}
          method="PATCH"
          submitLabel="Update destination"
          fields={[
            {
              name: "countryCode",
              label: "Country code",
              defaultValue: editing.city.country.code,
              required: true,
            },
            {
              name: "countryName",
              label: "Country name",
              defaultValue: editing.city.country.name,
              required: true,
            },
            {
              name: "cityName",
              label: "City",
              defaultValue: editing.city.name,
              required: true,
            },
            { name: "title", label: "Title", defaultValue: editing.title, required: true },
            { name: "slug", label: "Slug", defaultValue: editing.slug },
            {
              name: "airportCode",
              label: "Airport code",
              defaultValue: editing.airportCode ?? "",
            },
            {
              name: "summary",
              label: "Summary",
              type: "textarea",
              defaultValue: editing.summary ?? "",
            },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              rows: 6,
              defaultValue: editing.description ?? "",
            },
            {
              name: "travelInfo",
              label: "Travel info",
              type: "textarea",
              defaultValue: editing.travelInfo ?? "",
            },
            {
              name: "visaInfo",
              label: "Visa info",
              type: "textarea",
              defaultValue: editing.visaInfo ?? "",
            },
            {
              name: "weatherInfo",
              label: "Weather info",
              type: "textarea",
              defaultValue: editing.weatherInfo ?? "",
            },
            { name: "seoTitle", label: "SEO title", defaultValue: editing.seoTitle ?? "" },
            {
              name: "seoDescription",
              label: "SEO description",
              type: "textarea",
              defaultValue: editing.seoDescription ?? "",
            },
            {
              name: "heroImageUrl",
              label: "Hero image URL",
              type: "url",
              defaultValue: editing.heroImageUrl ?? "",
            },
            {
              name: "isFeatured",
              label: "Featured",
              type: "select",
              defaultValue: editing.isFeatured,
              options: [
                { value: "true", label: "Featured" },
                { value: "false", label: "Not featured" },
              ],
            },
            {
              name: "published",
              label: "Published",
              type: "select",
              defaultValue: editing.published,
              options: [
                { value: "true", label: "Published" },
                { value: "false", label: "Draft" },
              ],
            },
          ]}
        />
      ) : (
        <CmsEntityForm
          title="Add destination"
          endpoint="/api/admin/destinations"
          method="POST"
          submitLabel="Create destination"
          fields={[
            { name: "countryCode", label: "Country code", required: true, placeholder: "AE" },
            { name: "countryName", label: "Country name", required: true },
            { name: "cityName", label: "City", required: true },
            { name: "title", label: "Title", required: true },
            { name: "slug", label: "Slug", placeholder: "optional" },
            { name: "airportCode", label: "Airport code", placeholder: "DXB" },
            { name: "summary", label: "Summary", type: "textarea" },
            { name: "description", label: "Description", type: "textarea", rows: 6 },
            { name: "travelInfo", label: "Travel info", type: "textarea" },
            { name: "visaInfo", label: "Visa info", type: "textarea" },
            { name: "weatherInfo", label: "Weather info", type: "textarea" },
            { name: "seoTitle", label: "SEO title" },
            { name: "seoDescription", label: "SEO description", type: "textarea" },
            { name: "heroImageUrl", label: "Hero image URL", type: "url" },
            {
              name: "isFeatured",
              label: "Featured",
              type: "select",
              defaultValue: false,
              options: [
                { value: "true", label: "Featured" },
                { value: "false", label: "Not featured" },
              ],
            },
            {
              name: "published",
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
          No destinations found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)]">
                  <td className="px-3 py-2 font-medium">{item.title}</td>
                  <td className="px-3 py-2">
                    {item.city.name}, {item.city.country.code}
                  </td>
                  <td className="px-3 py-2">{item.slug}</td>
                  <td className="px-3 py-2">
                    {item.published ? "Published" : "Draft"}
                    {item.isFeatured ? " · Featured" : ""}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/destinations?edit=${item.id}&query=${encodeURIComponent(query)}&published=${published}&page=${page}`}
                        className="text-[var(--color-brand)]"
                      >
                        Edit
                      </Link>
                      <CmsToggleButton
                        endpoint={`/api/admin/destinations/${item.id}`}
                        payload={{ published: !item.published }}
                        label={item.published ? "Unpublish" : "Publish"}
                        variant={item.published ? "secondary" : "primary"}
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
        basePath="/admin/destinations"
        params={{ query, published }}
      />
    </div>
  );
}

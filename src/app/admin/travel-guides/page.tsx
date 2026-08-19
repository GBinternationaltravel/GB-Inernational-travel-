import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminPagination } from "@/features/admin/admin-tables";
import { CmsEntityForm, CmsToggleButton } from "@/features/admin/cms-form";
import {
  listAdminDestinations,
  listAdminTravelGuides,
} from "@/services/admin-cms-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminTravelGuidesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/travel-guides");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const status =
    (one(params.status) as "all" | "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined) ?? "all";
  const page = Number(one(params.page) ?? "1") || 1;
  const editId = one(params.edit);

  const [data, destinations] = await Promise.all([
    listAdminTravelGuides({ page, query, status }),
    listAdminDestinations({ page: 1, published: "all" }),
  ]);
  const editing = editId ? data.items.find((item) => item.id === editId) : undefined;

  const destinationOptions = [
    { value: "", label: "None" },
    ...destinations.items.map((d) => ({ value: d.id, label: d.title })),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Travel Guides</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Draft and publish destination travel guides.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Title or content"
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm md:col-span-2"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
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
          endpoint={`/api/admin/travel-guides/${editing.id}`}
          method="PATCH"
          submitLabel="Update guide"
          fields={[
            { name: "title", label: "Title", defaultValue: editing.title, required: true },
            { name: "slug", label: "Slug", defaultValue: editing.slug },
            {
              name: "destinationId",
              label: "Destination",
              type: "select",
              defaultValue: editing.destinationId ?? "",
              options: destinationOptions,
            },
            {
              name: "content",
              label: "Content",
              type: "textarea",
              rows: 10,
              defaultValue: editing.content,
              required: true,
            },
            {
              name: "coverImageUrl",
              label: "Cover image URL",
              type: "url",
              defaultValue: editing.coverImageUrl ?? "",
            },
            { name: "seoTitle", label: "SEO title", defaultValue: editing.seoTitle ?? "" },
            {
              name: "seoDescription",
              label: "SEO description",
              type: "textarea",
              defaultValue: editing.seoDescription ?? "",
            },
            {
              name: "status",
              label: "Status",
              type: "select",
              defaultValue: editing.status,
              options: [
                { value: "DRAFT", label: "Draft" },
                { value: "PUBLISHED", label: "Published" },
                { value: "ARCHIVED", label: "Archived" },
              ],
            },
          ]}
        />
      ) : (
        <CmsEntityForm
          title="Add travel guide"
          endpoint="/api/admin/travel-guides"
          method="POST"
          submitLabel="Create guide"
          fields={[
            { name: "title", label: "Title", required: true },
            { name: "slug", label: "Slug", placeholder: "optional" },
            {
              name: "destinationId",
              label: "Destination",
              type: "select",
              defaultValue: "",
              options: destinationOptions,
            },
            { name: "content", label: "Content", type: "textarea", rows: 10, required: true },
            { name: "coverImageUrl", label: "Cover image URL", type: "url" },
            { name: "seoTitle", label: "SEO title" },
            { name: "seoDescription", label: "SEO description", type: "textarea" },
            {
              name: "status",
              label: "Status",
              type: "select",
              defaultValue: "DRAFT",
              options: [
                { value: "DRAFT", label: "Draft" },
                { value: "PUBLISHED", label: "Published" },
                { value: "ARCHIVED", label: "Archived" },
              ],
            },
          ]}
        />
      )}

      {data.items.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-border)] bg-white p-6 text-sm text-[var(--color-muted)]">
          No travel guides found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Destination</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)]">
                  <td className="px-3 py-2 font-medium">{item.title}</td>
                  <td className="px-3 py-2">{item.destination?.title ?? "—"}</td>
                  <td className="px-3 py-2">{item.slug}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/travel-guides?edit=${item.id}&query=${encodeURIComponent(query)}&status=${status}&page=${page}`}
                        className="text-[var(--color-brand)]"
                      >
                        Edit
                      </Link>
                      {item.status !== "PUBLISHED" ? (
                        <CmsToggleButton
                          endpoint={`/api/admin/travel-guides/${item.id}`}
                          payload={{ status: "PUBLISHED" }}
                          label="Publish"
                        />
                      ) : (
                        <CmsToggleButton
                          endpoint={`/api/admin/travel-guides/${item.id}`}
                          payload={{ status: "DRAFT" }}
                          label="Unpublish"
                          variant="secondary"
                        />
                      )}
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
        basePath="/admin/travel-guides"
        params={{ query, status }}
      />
    </div>
  );
}

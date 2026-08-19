import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminPagination } from "@/features/admin/admin-tables";
import { CmsEntityForm, CmsToggleButton } from "@/features/admin/cms-form";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminTravelUpdates } from "@/services/admin-cms-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

const typeOptions = [
  { value: "FLIGHT", label: "Flight" },
  { value: "ROAD", label: "Road" },
  { value: "WEATHER", label: "Weather" },
  { value: "TOURISM", label: "Tourism" },
  { value: "ADVISORY", label: "Advisory" },
];

const priorityOptions = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export default async function AdminTravelUpdatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/travel-updates", { permissions: "cms.manage" });
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const published =
    (one(params.published) as "all" | "published" | "draft" | undefined) ?? "all";
  const type = one(params.type) ?? "";
  const page = Number(one(params.page) ?? "1") || 1;
  const editId = one(params.edit);

  const data = await listAdminTravelUpdates({ page, query, published, type: type || undefined });
  const editing = editId ? data.items.find((item) => item.id === editId) : undefined;

  const fields = (defaults?: {
    type?: string;
    title?: string;
    slug?: string;
    summary?: string | null;
    body?: string;
    priority?: string;
    region?: string | null;
    isPublished?: boolean;
    publishedAt?: Date | string | null;
    expiresAt?: Date | string | null;
  }) =>
    [
      {
        name: "type",
        label: "Type",
        type: "select" as const,
        defaultValue: defaults?.type ?? "ADVISORY",
        required: true,
        options: typeOptions,
      },
      {
        name: "title",
        label: "Title",
        defaultValue: defaults?.title ?? "",
        required: true,
      },
      {
        name: "slug",
        label: "Slug (optional)",
        defaultValue: defaults?.slug ?? "",
        placeholder: "auto-from-title",
      },
      {
        name: "summary",
        label: "Summary",
        type: "textarea" as const,
        defaultValue: defaults?.summary ?? "",
        rows: 2,
      },
      {
        name: "body",
        label: "Body",
        type: "textarea" as const,
        defaultValue: defaults?.body ?? "",
        required: true,
        rows: 8,
      },
      {
        name: "priority",
        label: "Priority",
        type: "select" as const,
        defaultValue: defaults?.priority ?? "NORMAL",
        options: priorityOptions,
      },
      {
        name: "region",
        label: "Region",
        defaultValue: defaults?.region ?? "",
        placeholder: "e.g. Hunza, Skardu",
      },
      {
        name: "publishedAt",
        label: "Published at",
        type: "date" as const,
        defaultValue: toDateInput(defaults?.publishedAt),
      },
      {
        name: "expiresAt",
        label: "Expires at",
        type: "date" as const,
        defaultValue: toDateInput(defaults?.expiresAt),
      },
      {
        name: "isPublished",
        label: "Published",
        type: "select" as const,
        defaultValue: defaults?.isPublished ?? false,
        options: [
          { value: "true", label: "Published" },
          { value: "false", label: "Draft" },
        ],
      },
    ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Travel Updates</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Gilgit-Baltistan flight, road, weather, tourism, and advisory updates.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-5">
        <input
          name="query"
          defaultValue={query}
          placeholder="Title, region, or body"
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
        <select
          name="type"
          defaultValue={type}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="">All types</option>
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
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

      {editing ? (
        <CmsEntityForm
          title={`Edit ${editing.title}`}
          endpoint={`/api/admin/travel-updates/${editing.id}`}
          method="PATCH"
          submitLabel="Update"
          fields={fields(editing)}
        />
      ) : (
        <CmsEntityForm
          title="Add travel update"
          endpoint="/api/admin/travel-updates"
          method="POST"
          submitLabel="Create update"
          fields={fields()}
        />
      )}

      {data.items.length === 0 ? (
        <EmptyState
          title="No travel updates found"
          description="Create an update above, or adjust your filters."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Region</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--color-border)]">
                    <td className="px-3 py-2 font-medium">{item.title}</td>
                    <td className="px-3 py-2">{item.type}</td>
                    <td className="px-3 py-2">{item.priority}</td>
                    <td className="px-3 py-2">{item.region ?? "—"}</td>
                    <td className="px-3 py-2">
                      {item.isPublished ? "Published" : "Draft"}
                      {item.expiresAt && new Date(item.expiresAt) <= new Date()
                        ? " · Expired"
                        : ""}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/travel-updates?edit=${item.id}&query=${encodeURIComponent(query)}&published=${published}&type=${encodeURIComponent(type)}&page=${page}`}
                          className="text-[var(--color-brand)]"
                        >
                          Edit
                        </Link>
                        <CmsToggleButton
                          endpoint={`/api/admin/travel-updates/${item.id}`}
                          payload={{ isPublished: !item.isPublished }}
                          label={item.isPublished ? "Unpublish" : "Publish"}
                          variant={item.isPublished ? "secondary" : "primary"}
                        />
                        <CmsToggleButton
                          endpoint={`/api/admin/travel-updates/${item.id}`}
                          payload={{
                            action: "priority",
                            priority:
                              item.priority === "URGENT"
                                ? "HIGH"
                                : item.priority === "HIGH"
                                  ? "URGENT"
                                  : "HIGH",
                          }}
                          label={item.priority === "URGENT" ? "Lower priority" : "Raise priority"}
                          variant="secondary"
                        />
                        <CmsToggleButton
                          endpoint={`/api/admin/travel-updates/${item.id}`}
                          payload={{ action: "expire" }}
                          label="Expire"
                          variant="secondary"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {data.items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-sm"
              >
                <p className="font-medium">{item.title}</p>
                <p className="text-[var(--color-muted)]">
                  {item.type} · {item.priority} · {item.isPublished ? "Published" : "Draft"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/travel-updates?edit=${item.id}&query=${encodeURIComponent(query)}&published=${published}&type=${encodeURIComponent(type)}&page=${page}`}
                    className="text-[var(--color-brand)]"
                  >
                    Edit
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <AdminPagination
        page={data.page}
        totalPages={data.pageCount}
        basePath="/admin/travel-updates"
        params={{ query, published, type }}
      />
    </div>
  );
}

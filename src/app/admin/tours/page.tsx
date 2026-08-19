import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminPagination } from "@/features/admin/admin-tables";
import { CmsEntityForm, CmsToggleButton } from "@/features/admin/cms-form";
import { EmptyState } from "@/components/ui/empty-state";
import { jsonToFormText, listAdminTours } from "@/services/admin-cms-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const destinationOptions = [
  { value: "HUNZA", label: "Hunza" },
  { value: "SKARDU", label: "Skardu" },
  { value: "GILGIT", label: "Gilgit" },
  { value: "NALTAR", label: "Naltar" },
  { value: "KHUNJERAB", label: "Khunjerab" },
  { value: "FAIRY_MEADOWS", label: "Fairy Meadows" },
  { value: "DEOSAI", label: "Deosai" },
];

const seasonOptions = [
  { value: "SPRING", label: "Spring" },
  { value: "SUMMER", label: "Summer" },
  { value: "AUTUMN", label: "Autumn" },
  { value: "WINTER", label: "Winter" },
];

const statusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

export default async function AdminToursPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/tours", { permissions: "cms.manage" });
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const status =
    (one(params.status) as "all" | "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined) ??
    "all";
  const destination = one(params.destination) ?? "";
  const page = Number(one(params.page) ?? "1") || 1;
  const editId = one(params.edit);

  const data = await listAdminTours({
    page,
    query,
    status,
    destination: destination || undefined,
  });
  const editing = editId ? data.items.find((item) => item.id === editId) : undefined;

  const fields = (defaults?: {
    name?: string;
    slug?: string;
    destination?: string;
    season?: string;
    durationDays?: number;
    price?: number | { toString(): string };
    currency?: string;
    description?: string | null;
    highlights?: unknown;
    itinerary?: unknown;
    hotel?: string | null;
    transport?: string | null;
    meals?: string | null;
    included?: string | null;
    excluded?: string | null;
    images?: unknown;
    availabilityNote?: string | null;
    status?: string;
  }) =>
    [
      { name: "name", label: "Name", defaultValue: defaults?.name ?? "", required: true },
      {
        name: "slug",
        label: "Slug (optional)",
        defaultValue: defaults?.slug ?? "",
        placeholder: "auto-from-name",
      },
      {
        name: "destination",
        label: "Destination",
        type: "select" as const,
        defaultValue: defaults?.destination ?? "HUNZA",
        required: true,
        options: destinationOptions,
      },
      {
        name: "season",
        label: "Season",
        type: "select" as const,
        defaultValue: defaults?.season ?? "SUMMER",
        required: true,
        options: seasonOptions,
      },
      {
        name: "durationDays",
        label: "Duration (days)",
        type: "number" as const,
        defaultValue: defaults?.durationDays ?? 5,
        required: true,
      },
      {
        name: "price",
        label: "Price",
        type: "number" as const,
        step: "0.01",
        defaultValue: defaults?.price != null ? Number(defaults.price) : 0,
        required: true,
      },
      {
        name: "currency",
        label: "Currency",
        defaultValue: defaults?.currency ?? "PKR",
        required: true,
      },
      {
        name: "description",
        label: "Description",
        type: "textarea" as const,
        defaultValue: defaults?.description ?? "",
        rows: 4,
      },
      {
        name: "highlights",
        label: "Highlights (one per line or JSON)",
        type: "textarea" as const,
        defaultValue: jsonToFormText(defaults?.highlights as never),
        rows: 3,
      },
      {
        name: "itinerary",
        label: "Itinerary (one per line or JSON)",
        type: "textarea" as const,
        defaultValue: jsonToFormText(defaults?.itinerary as never),
        rows: 5,
      },
      { name: "hotel", label: "Hotel", defaultValue: defaults?.hotel ?? "" },
      { name: "transport", label: "Transport", defaultValue: defaults?.transport ?? "" },
      { name: "meals", label: "Meals", defaultValue: defaults?.meals ?? "" },
      {
        name: "included",
        label: "Included",
        type: "textarea" as const,
        defaultValue: defaults?.included ?? "",
      },
      {
        name: "excluded",
        label: "Excluded",
        type: "textarea" as const,
        defaultValue: defaults?.excluded ?? "",
      },
      {
        name: "images",
        label: "Images (URLs, one per line)",
        type: "textarea" as const,
        defaultValue: jsonToFormText(defaults?.images as never),
      },
      {
        name: "availabilityNote",
        label: "Availability note",
        type: "textarea" as const,
        defaultValue: defaults?.availabilityNote ?? "",
        rows: 2,
      },
      {
        name: "status",
        label: "Status",
        type: "select" as const,
        defaultValue: defaults?.status ?? "DRAFT",
        options: statusOptions,
      },
    ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Tours</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Gilgit-Baltistan tour packages. Public flow records inquiries only — not live inventory.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-5">
        <input
          name="query"
          defaultValue={query}
          placeholder="Name or slug"
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm md:col-span-2"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          name="destination"
          defaultValue={destination}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="">All destinations</option>
          {destinationOptions.map((opt) => (
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
          title={`Edit ${editing.name}`}
          endpoint={`/api/admin/tours/${editing.id}`}
          method="PATCH"
          submitLabel="Update tour"
          fields={fields(editing)}
        />
      ) : (
        <CmsEntityForm
          title="Add tour package"
          endpoint="/api/admin/tours"
          method="POST"
          submitLabel="Create tour"
          fields={fields()}
        />
      )}

      {data.items.length === 0 ? (
        <EmptyState
          title="No tours found"
          description="Create a package above, or adjust your filters."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Destination</th>
                  <th className="px-3 py-2">Season</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Inquiries</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--color-border)]">
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2">{item.destination.replaceAll("_", " ")}</td>
                    <td className="px-3 py-2">{item.season}</td>
                    <td className="px-3 py-2">
                      {Number(item.price)} {item.currency}
                    </td>
                    <td className="px-3 py-2">{item.status}</td>
                    <td className="px-3 py-2">{item._count.inquiries}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/tours?edit=${item.id}&query=${encodeURIComponent(query)}&status=${status}&destination=${encodeURIComponent(destination)}&page=${page}`}
                          className="text-[var(--color-brand)]"
                        >
                          Edit
                        </Link>
                        {item.status !== "PUBLISHED" ? (
                          <CmsToggleButton
                            endpoint={`/api/admin/tours/${item.id}`}
                            payload={{ status: "PUBLISHED" }}
                            label="Publish"
                            variant="primary"
                          />
                        ) : (
                          <CmsToggleButton
                            endpoint={`/api/admin/tours/${item.id}`}
                            payload={{ status: "DRAFT" }}
                            label="Unpublish"
                            variant="secondary"
                          />
                        )}
                        {item.status !== "ARCHIVED" ? (
                          <CmsToggleButton
                            endpoint={`/api/admin/tours/${item.id}`}
                            payload={{ status: "ARCHIVED" }}
                            label="Archive"
                            variant="secondary"
                          />
                        ) : null}
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
                <p className="font-medium">{item.name}</p>
                <p className="text-[var(--color-muted)]">
                  {item.destination.replaceAll("_", " ")} · {item.status} · {Number(item.price)}{" "}
                  {item.currency}
                </p>
                <Link
                  href={`/admin/tours?edit=${item.id}&query=${encodeURIComponent(query)}&status=${status}&destination=${encodeURIComponent(destination)}&page=${page}`}
                  className="mt-2 inline-flex text-[var(--color-brand)]"
                >
                  Edit
                </Link>
              </article>
            ))}
          </div>
        </>
      )}

      <AdminPagination
        page={data.page}
        totalPages={data.pageCount}
        basePath="/admin/tours"
        params={{ query, status, destination }}
      />
    </div>
  );
}

import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminPagination } from "@/features/admin/admin-tables";
import { CmsEntityForm, CmsToggleButton } from "@/features/admin/cms-form";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminVisaGuides } from "@/services/admin-cms-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const destinationKeyOptions = [
  { value: "UAE_DUBAI", label: "UAE / Dubai" },
  { value: "TURKEY", label: "Turkey" },
  { value: "THAILAND", label: "Thailand" },
  { value: "SINGAPORE", label: "Singapore" },
];

export default async function AdminVisaGuidesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/visa-guides", { permissions: "cms.manage" });
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const published =
    (one(params.published) as "all" | "published" | "draft" | undefined) ?? "all";
  const page = Number(one(params.page) ?? "1") || 1;
  const editId = one(params.edit);

  const data = await listAdminVisaGuides({ page, query, published });
  const editing = editId ? data.items.find((item) => item.id === editId) : undefined;

  const fields = (defaults?: {
    destinationKey?: string;
    countryName?: string;
    cityName?: string | null;
    slug?: string;
    visaType?: string | null;
    eligibility?: string | null;
    requiredDocuments?: string | null;
    processingInfo?: string | null;
    duration?: string | null;
    feesNote?: string | null;
    importantNotes?: string | null;
    officialSourceUrl?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    isPublished?: boolean;
  }) =>
    [
      {
        name: "destinationKey",
        label: "Destination key",
        type: "select" as const,
        defaultValue: defaults?.destinationKey ?? "UAE_DUBAI",
        required: true,
        options: destinationKeyOptions,
      },
      {
        name: "countryName",
        label: "Country name",
        defaultValue: defaults?.countryName ?? "",
        required: true,
      },
      {
        name: "cityName",
        label: "City (optional)",
        defaultValue: defaults?.cityName ?? "",
      },
      {
        name: "slug",
        label: "Slug (optional)",
        defaultValue: defaults?.slug ?? "",
        placeholder: "auto-from-country",
      },
      { name: "visaType", label: "Visa type", defaultValue: defaults?.visaType ?? "" },
      {
        name: "eligibility",
        label: "Eligibility",
        type: "textarea" as const,
        defaultValue: defaults?.eligibility ?? "",
      },
      {
        name: "requiredDocuments",
        label: "Required documents",
        type: "textarea" as const,
        defaultValue: defaults?.requiredDocuments ?? "",
        rows: 5,
      },
      {
        name: "processingInfo",
        label: "Processing info",
        type: "textarea" as const,
        defaultValue: defaults?.processingInfo ?? "",
      },
      { name: "duration", label: "Duration", defaultValue: defaults?.duration ?? "" },
      {
        name: "feesNote",
        label: "Fees note",
        type: "textarea" as const,
        defaultValue: defaults?.feesNote ?? "",
      },
      {
        name: "importantNotes",
        label: "Important notes",
        type: "textarea" as const,
        defaultValue: defaults?.importantNotes ?? "",
      },
      {
        name: "officialSourceUrl",
        label: "Official source URL",
        type: "url" as const,
        defaultValue: defaults?.officialSourceUrl ?? "",
      },
      { name: "seoTitle", label: "SEO title", defaultValue: defaults?.seoTitle ?? "" },
      {
        name: "seoDescription",
        label: "SEO description",
        type: "textarea" as const,
        defaultValue: defaults?.seoDescription ?? "",
        rows: 2,
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
        <h1 className="font-display text-3xl">Visa Guides</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Informational visa content. Always remind travelers to verify with official authorities.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Country, city, or visa type"
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
          title={`Edit ${editing.countryName}`}
          endpoint={`/api/admin/visa-guides/${editing.id}`}
          method="PATCH"
          submitLabel="Update guide"
          fields={fields(editing)}
        />
      ) : (
        <CmsEntityForm
          title="Add visa guide"
          endpoint="/api/admin/visa-guides"
          method="POST"
          submitLabel="Create guide"
          fields={fields()}
        />
      )}

      {data.items.length === 0 ? (
        <EmptyState
          title="No visa guides found"
          description="Create a guide above, or adjust your filters."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2">Country</th>
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Visa type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--color-border)]">
                    <td className="px-3 py-2 font-medium">
                      {item.countryName}
                      {item.cityName ? ` · ${item.cityName}` : ""}
                    </td>
                    <td className="px-3 py-2">{item.destinationKey}</td>
                    <td className="px-3 py-2">{item.visaType ?? "—"}</td>
                    <td className="px-3 py-2">{item.isPublished ? "Published" : "Draft"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/visa-guides?edit=${item.id}&query=${encodeURIComponent(query)}&published=${published}&page=${page}`}
                          className="text-[var(--color-brand)]"
                        >
                          Edit
                        </Link>
                        <CmsToggleButton
                          endpoint={`/api/admin/visa-guides/${item.id}`}
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
          <div className="space-y-3 md:hidden">
            {data.items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-sm"
              >
                <p className="font-medium">
                  {item.countryName}
                  {item.cityName ? ` · ${item.cityName}` : ""}
                </p>
                <p className="text-[var(--color-muted)]">
                  {item.destinationKey} · {item.isPublished ? "Published" : "Draft"}
                </p>
                <Link
                  href={`/admin/visa-guides?edit=${item.id}&query=${encodeURIComponent(query)}&published=${published}&page=${page}`}
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
        basePath="/admin/visa-guides"
        params={{ query, published }}
      />
    </div>
  );
}

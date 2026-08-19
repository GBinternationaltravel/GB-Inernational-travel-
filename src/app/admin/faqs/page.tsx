import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminPagination } from "@/features/admin/admin-tables";
import { CmsEntityForm, CmsToggleButton } from "@/features/admin/cms-form";
import { listAdminFaqs } from "@/services/admin-cms-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/faqs");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const published =
    (one(params.published) as "all" | "published" | "draft" | undefined) ?? "all";
  const page = Number(one(params.page) ?? "1") || 1;
  const editId = one(params.edit);

  const data = await listAdminFaqs({ page, query, published });
  const editing = editId ? data.items.find((item) => item.id === editId) : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">FAQs</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Manage frequently asked questions shown on the site.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Question, answer, or category"
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
          title="Edit FAQ"
          endpoint={`/api/admin/faqs/${editing.id}`}
          method="PATCH"
          submitLabel="Update FAQ"
          fields={[
            {
              name: "question",
              label: "Question",
              defaultValue: editing.question,
              required: true,
            },
            {
              name: "answer",
              label: "Answer",
              type: "textarea",
              rows: 6,
              defaultValue: editing.answer,
              required: true,
            },
            { name: "category", label: "Category", defaultValue: editing.category ?? "" },
            {
              name: "sortOrder",
              label: "Sort order",
              type: "number",
              defaultValue: editing.sortOrder,
            },
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
          title="Add FAQ"
          endpoint="/api/admin/faqs"
          method="POST"
          submitLabel="Create FAQ"
          fields={[
            { name: "question", label: "Question", required: true },
            { name: "answer", label: "Answer", type: "textarea", rows: 6, required: true },
            { name: "category", label: "Category" },
            { name: "sortOrder", label: "Sort order", type: "number", defaultValue: 0 },
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
          No FAQs found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">Question</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)]">
                  <td className="px-3 py-2 font-medium">{item.question}</td>
                  <td className="px-3 py-2">{item.category ?? "—"}</td>
                  <td className="px-3 py-2">{item.sortOrder}</td>
                  <td className="px-3 py-2">{item.isPublished ? "Published" : "Draft"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/faqs?edit=${item.id}&query=${encodeURIComponent(query)}&published=${published}&page=${page}`}
                        className="text-[var(--color-brand)]"
                      >
                        Edit
                      </Link>
                      <CmsToggleButton
                        endpoint={`/api/admin/faqs/${item.id}`}
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
        basePath="/admin/faqs"
        params={{ query, published }}
      />
    </div>
  );
}

import { requireAdminPage } from "@/lib/auth/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { formatFlightDate } from "@/lib/flights/filter-sort";
import { listAuditLogs } from "@/lib/security/audit";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/audit-logs", { permissions: "audit.view" });
  const params = await searchParams;
  const query = (one(params.query) ?? "").trim().toLowerCase();
  const limit = Math.min(200, Math.max(25, Number(one(params.limit) ?? "100") || 100));

  const logs = await listAuditLogs(limit);
  const filtered = query
    ? logs.filter((log) => {
        const hay = [
          log.action,
          log.entityType,
          log.entityId,
          log.userId,
          log.ipAddress,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      })
    : logs;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Audit logs</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Recent admin actions. Passwords and secrets are never stored in audit metadata.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Action, entity, user id"
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm md:col-span-2"
        />
        <select
          name="limit"
          defaultValue={String(limit)}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
        >
          Filter
        </button>
      </form>

      {filtered.length === 0 ? (
        <EmptyState
          title="No audit events"
          description="Actions such as login, booking status, payments, tickets, CMS, and permission changes appear here."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--color-border)]">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatFlightDate(String(log.createdAt))}
                    </td>
                    <td className="px-3 py-2 font-medium">{log.action}</td>
                    <td className="px-3 py-2">
                      {log.entityType ?? "—"}{" "}
                      <span className="text-[var(--color-muted)]">{log.entityId ?? ""}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{log.userId ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{log.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {filtered.map((log) => (
              <article
                key={log.id}
                className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-sm"
              >
                <p className="font-medium">{log.action}</p>
                <p className="text-[var(--color-muted)]">
                  {log.entityType ?? "—"} {log.entityId ?? ""}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {formatFlightDate(String(log.createdAt))}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

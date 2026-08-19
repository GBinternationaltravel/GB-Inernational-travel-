import { requireAdminPage } from "@/lib/auth/admin";
import { listNotificationsForAdmin } from "@/lib/notifications/notification-store";
import { AdminStoreBanner } from "@/features/admin/admin-ui";
import { formatFlightDate, formatFlightTime } from "@/lib/flights/filter-sort";
import { resolveDataStoreStatus } from "@/lib/data-store";
import { Alert } from "@/components/ui/alert";

export default async function AdminNotificationsPage() {
  await requireAdminPage("/admin/notifications");
  const [items, store] = await Promise.all([
    listNotificationsForAdmin(100),
    resolveDataStoreStatus(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Notifications</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Delivery monitoring for travel emails. Recipients are masked. Secrets, passport
          numbers, and card data are never shown.
        </p>
      </div>

      {store.productionUsingFileStore ? (
        <Alert variant="warning">
          PRODUCTION WARNING: file storage is active. PostgreSQL must be the source of truth.
        </Alert>
      ) : (
        <AdminStoreBanner
          developmentDataStore={store.booking === "file" || store.auth === "file"}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-3 font-medium">Event</th>
              <th className="px-3 py-3 font-medium">Booking</th>
              <th className="px-3 py-3 font-medium">Channel</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Provider</th>
              <th className="px-3 py-3 font-medium">Created</th>
              <th className="px-3 py-3 font-medium">Sent</th>
              <th className="px-3 py-3 font-medium">Failure</th>
              <th className="px-3 py-3 font-medium">Retry</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-[var(--color-muted)]">
                  No notification attempts recorded yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)]">
                  <td className="px-3 py-3 font-medium">{item.eventType}</td>
                  <td className="px-3 py-3">{item.bookingReference ?? "—"}</td>
                  <td className="px-3 py-3">{item.channel}</td>
                  <td className="px-3 py-3">{item.status}</td>
                  <td className="px-3 py-3">{item.providerCode ?? "—"}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatFlightDate(item.createdAt)} {formatFlightTime(item.createdAt)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {item.sentAt
                      ? `${formatFlightDate(item.sentAt)} ${formatFlightTime(item.sentAt)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-muted)]">
                    {item.failureReason ?? "—"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-[var(--color-muted)]">
                    {item.retryState}
                    {item.retryCount ? ` (${item.retryCount})` : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { requireAdminPage } from "@/lib/auth/admin";
import { CmsEntityForm } from "@/features/admin/cms-form";
import { listAuditLogs, writeAuditLog } from "@/lib/security/audit";
import { formatFlightDate } from "@/lib/flights/filter-sort";
import { getAdminSettings } from "@/services/admin-cms-service";

export default async function AdminSettingsPage() {
  const admin = await requireAdminPage("/admin/settings", { permissions: "settings.manage" });
  await writeAuditLog({
    userId: admin.id,
    action: "ADMIN_SETTINGS_VIEWED",
    entityType: "Settings",
    entityId: "admin",
  });

  const [settings, logs] = await Promise.all([getAdminSettings(), listAuditLogs(25)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Company contact details and ticket issuance mode.
        </p>
      </div>

      <CmsEntityForm
        title="Site settings"
        endpoint="/api/admin/settings"
        method="PUT"
        submitLabel="Save settings"
        fields={[
          {
            name: "companyName",
            label: "Company name",
            defaultValue: settings.companyName,
            required: true,
          },
          {
            name: "supportEmail",
            label: "Support email",
            type: "email",
            defaultValue: settings.supportEmail,
            required: true,
          },
          {
            name: "supportPhone",
            label: "Support phone",
            defaultValue: settings.supportPhone ?? "",
          },
          {
            name: "address",
            label: "Address",
            type: "textarea",
            defaultValue: settings.address ?? "",
          },
          {
            name: "defaultCurrency",
            label: "Default currency",
            defaultValue: settings.defaultCurrency,
            required: true,
          },
          {
            name: "bookingSupportNote",
            label: "Booking support note",
            type: "textarea",
            defaultValue: settings.bookingSupportNote ?? "",
          },
          {
            name: "ticketIssuerMode",
            label: "Ticket issuer mode",
            type: "select",
            defaultValue: settings.ticketIssuerMode,
            options: [
              { value: "MOCK", label: "Mock" },
              { value: "SANDBOX", label: "Sandbox" },
              { value: "MANUAL", label: "Manual" },
              { value: "LIVE", label: "Live" },
            ],
          },
        ]}
      />

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Recent audit events</h2>
          <a href="/admin/audit-logs" className="text-sm text-[var(--color-brand)]">
            View all
          </a>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {logs.map((log) => (
            <li key={log.id} className="border-b border-[var(--color-border)] pb-2">
              <span className="font-medium">{log.action}</span>
              <span className="text-[var(--color-muted)]">
                {" "}
                · {log.entityType ?? "—"} {log.entityId ?? ""} ·{" "}
                {formatFlightDate(String(log.createdAt))}
              </span>
            </li>
          ))}
          {!logs.length ? (
            <li className="text-[var(--color-muted)]">No audit events yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

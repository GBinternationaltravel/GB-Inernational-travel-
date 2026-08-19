import { Alert } from "@/components/ui/alert";

export function AdminStoreBanner({
  developmentDataStore,
}: {
  developmentDataStore: boolean;
}) {
  if (!developmentDataStore) return null;
  return (
    <Alert variant="warning" className="mb-4">
      Development data store — local file fallback is active. Production admin requires
      PostgreSQL.
    </Alert>
  );
}

export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-white p-8">
      <h1 className="text-2xl font-semibold text-[var(--color-navy)]">{title}</h1>
      <p className="mt-3 text-sm text-[var(--color-muted)]">
        Coming in Content Management Phase
      </p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "info" | "premium" | "warning";
}) {
  const accent =
    tone === "success"
      ? "border-l-[var(--color-emerald)]"
      : tone === "info"
        ? "border-l-[var(--color-sky)]"
        : tone === "premium"
          ? "border-l-[var(--color-gold)]"
          : tone === "warning"
            ? "border-l-[var(--color-warning)]"
            : "border-l-[var(--color-navy)]";

  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] border-l-4 bg-white p-4 shadow-[var(--shadow-card)] ${accent}`}
    >
      <p className="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-navy)]">{value}</p>
    </div>
  );
}

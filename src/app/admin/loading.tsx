export default function AdminLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded bg-[var(--color-border)]" />
      <div className="h-4 w-72 rounded bg-[var(--color-border)]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-[var(--color-border)] bg-white" />
        ))}
      </div>
      <div className="h-64 rounded-xl border border-[var(--color-border)] bg-white" />
    </div>
  );
}

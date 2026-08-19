import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--color-border)] px-6 py-10 text-center",
        className,
      )}
    >
      <Inbox className="h-8 w-8 text-[var(--color-muted)]" />
      <div>
        <p className="font-medium text-[var(--color-ink)]">{title}</p>
        {description ? (
          <p className="mt-1 max-w-md text-sm text-[var(--color-muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

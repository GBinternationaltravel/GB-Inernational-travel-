import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "info"
  | "error"
  | "premium"
  | "navy";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-surface-muted)] text-[var(--color-ink)]",
  success: "bg-[color-mix(in_srgb,var(--color-emerald)_14%,white)] text-[var(--color-emerald-dark)]",
  warning: "bg-[color-mix(in_srgb,var(--color-warning)_16%,white)] text-[#8a4b12]",
  info: "bg-[color-mix(in_srgb,var(--color-sky)_14%,white)] text-[var(--color-sky-dark)]",
  error: "bg-[color-mix(in_srgb,var(--color-error)_12%,white)] text-[var(--color-error)]",
  premium: "bg-[color-mix(in_srgb,var(--color-gold)_22%,white)] text-[#7a5a18]",
  navy: "bg-[var(--color-navy)] text-white",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-semibold tracking-wide",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

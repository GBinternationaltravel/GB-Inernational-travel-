import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "error";

const styles: Record<AlertVariant, string> = {
  info: "border-[color-mix(in_srgb,var(--color-sky)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-sky)_8%,white)] text-[var(--color-navy)]",
  success:
    "border-[color-mix(in_srgb,var(--color-emerald)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-emerald)_8%,white)] text-[var(--color-navy)]",
  warning:
    "border-[color-mix(in_srgb,var(--color-warning)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_10%,white)] text-[var(--color-navy)]",
  error:
    "border-[color-mix(in_srgb,var(--color-error)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_8%,white)] text-[var(--color-navy)]",
};

const iconColor: Record<AlertVariant, string> = {
  info: "text-[var(--color-sky)]",
  success: "text-[var(--color-emerald)]",
  warning: "text-[var(--color-warning)]",
  error: "text-[var(--color-error)]",
};

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

export function Alert({
  title,
  children,
  variant = "info",
  className,
}: {
  title?: string;
  children: React.ReactNode;
  variant?: AlertVariant;
  className?: string;
}) {
  const Icon = icons[variant];

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm",
        styles[variant],
        className,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor[variant])} aria-hidden />
      <div>
        {title ? <p className="mb-1 font-semibold">{title}</p> : null}
        <div className="text-[var(--color-text-secondary)]">{children}</div>
      </div>
    </div>
  );
}

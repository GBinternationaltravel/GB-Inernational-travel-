import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "premium";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-emerald)] text-white hover:bg-[var(--color-emerald-dark)] focus-visible:ring-[var(--color-emerald)] shadow-sm",
  secondary:
    "bg-[var(--color-sky)] text-white hover:bg-[var(--color-sky-dark)] focus-visible:ring-[var(--color-sky)] shadow-sm",
  outline:
    "border border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-navy)]/20 hover:bg-[var(--color-surface-muted)]",
  ghost: "bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]",
  danger:
    "bg-[var(--color-error)] text-white hover:brightness-95 focus-visible:ring-[var(--color-error)]",
  premium:
    "bg-[var(--color-gold)] text-[var(--color-navy)] hover:bg-[var(--color-gold-dark)] hover:text-white focus-visible:ring-[var(--color-gold)] shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold tracking-tight transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:translate-y-px",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? "Please wait…" : children}
      </button>
    );
  },
);

Button.displayName = "Button";

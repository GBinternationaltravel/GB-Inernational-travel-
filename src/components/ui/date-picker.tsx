import * as React from "react";
import { cn } from "@/lib/utils";

export interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** Native date input foundation — can be replaced with a richer picker later. */
export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-ink)]">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          type="date"
          className={cn(
            "h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]",
            error && "border-red-500",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";

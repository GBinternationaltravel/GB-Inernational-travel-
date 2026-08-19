import Link from "next/link";
import { Check } from "lucide-react";
import {
  bookingProgressSteps,
  type BookingProgressKey,
} from "@/config/booking";
import { cn } from "@/lib/utils";

const stepOrder: BookingProgressKey[] = bookingProgressSteps.map((step) => step.key);

export function BookingProgress({
  current,
  reference,
}: {
  current: BookingProgressKey;
  reference?: string;
}) {
  const currentIndex = stepOrder.indexOf(current);

  return (
    <nav aria-label="Booking progress" className="w-full">
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 shadow-[var(--shadow-card)] sm:hidden">
        <p className="text-sm font-semibold text-[var(--color-navy)]">
          Step {currentIndex + 1} of {bookingProgressSteps.length}:{" "}
          {bookingProgressSteps[currentIndex]?.label}
        </p>
        <div className="flex gap-1" aria-hidden="true">
          {bookingProgressSteps.map((step, index) => (
            <span
              key={step.key}
              className={cn(
                "h-1.5 w-4 rounded-full",
                index <= currentIndex ? "bg-[var(--color-emerald)]" : "bg-[var(--color-border)]",
              )}
            />
          ))}
        </div>
      </div>

      <ol className="hidden gap-2 sm:grid sm:grid-cols-6">
        {bookingProgressSteps.map((step, index) => {
          const completed = index < currentIndex;
          const active = index === currentIndex;
          const clickable =
            completed &&
            step.href &&
            (step.key === "search" ||
              step.key === "flight" ||
              (step.key === "passenger" && reference) ||
              (step.key === "review" && reference));

          const content = (
            <span
              className={cn(
                "flex items-center gap-2 rounded-[var(--radius-md)] border px-2 py-2 text-xs font-semibold",
                active && "border-[var(--color-emerald)] bg-[var(--color-emerald)] text-white",
                completed &&
                  !active &&
                  "border-[color-mix(in_srgb,var(--color-emerald)_30%,white)] bg-[color-mix(in_srgb,var(--color-emerald)_10%,white)] text-[var(--color-emerald-dark)]",
                !completed &&
                  !active &&
                  "border-[var(--color-border)] bg-white text-[var(--color-muted)]",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                  active ? "bg-white/20" : "bg-black/5",
                )}
              >
                {completed ? <Check className="h-3 w-3" aria-hidden /> : index + 1}
              </span>
              {step.label}
            </span>
          );

          return (
            <li key={step.key}>
              {clickable && step.href ? (
                <Link
                  href={
                    step.key === "review" && reference
                      ? `${step.href}?ref=${encodeURIComponent(reference)}`
                      : step.key === "passenger" && reference
                        ? `${step.href}?ref=${encodeURIComponent(reference)}`
                        : step.href
                  }
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

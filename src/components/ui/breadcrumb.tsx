import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "@/types/content";
import { cn } from "@/lib/utils";

export function Breadcrumb({
  items,
  className,
  tone = "default",
}: {
  items: BreadcrumbItem[];
  className?: string;
  tone?: "default" | "onDark";
}) {
  const onDark = tone === "onDark";
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol
        className={cn(
          "flex flex-wrap items-center gap-1",
          onDark ? "text-white/65" : "text-[var(--color-muted)]",
        )}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={onDark ? "hover:text-white" : "hover:text-[var(--color-ink)]"}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? (onDark ? "text-white/90" : "text-[var(--color-ink)]") : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

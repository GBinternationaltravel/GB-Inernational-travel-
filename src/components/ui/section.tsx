import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";

export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-14 sm:py-16", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 max-w-2xl", className)}>
      <h2 className="text-3xl font-bold tracking-tight text-[var(--color-navy)] sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base text-[var(--color-muted)]">{description}</p>
      ) : null}
    </div>
  );
}

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center",
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-8 w-8 text-red-700" />
      <div>
        <p className="font-medium text-red-950">{title}</p>
        {description ? (
          <p className="mt-1 max-w-md text-sm text-red-800">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

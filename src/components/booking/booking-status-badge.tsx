export function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT: {
      label: "Draft",
      className: "bg-[var(--color-surface-muted)] text-[var(--color-ink)]",
    },
    PENDING_PAYMENT: {
      label: "Payment Pending",
      className: "bg-amber-100 text-amber-900",
    },
    PAYMENT_PROCESSING: {
      label: "Payment Processing",
      className: "bg-sky-100 text-sky-900",
    },
    PAYMENT_RECEIVED: {
      label: "Payment Received",
      className: "bg-emerald-100 text-emerald-900",
    },
    TICKETING_PENDING: {
      label: "Awaiting Ticket Confirmation",
      className: "bg-amber-100 text-amber-950",
    },
    CONFIRMED: {
      label: "Confirmed",
      className: "bg-emerald-100 text-emerald-900",
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-red-100 text-red-900",
    },
    EXPIRED: {
      label: "Expired",
      className: "bg-slate-200 text-slate-800",
    },
    FAILED: {
      label: "Failed",
      className: "bg-red-100 text-red-900",
    },
    REFUNDED: {
      label: "Refunded",
      className: "bg-sky-100 text-sky-900",
    },
  };

  const item = map[status] ?? {
    label: status,
    className: "bg-[var(--color-surface-muted)] text-[var(--color-ink)]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${item.className}`}
    >
      {item.label}
    </span>
  );
}

import { formatFlightDate, formatPrice } from "@/lib/flights/filter-sort";
import { calculateAgencyMarkup } from "@/lib/booking/pricing";

export type FareBarLeg = {
  date: string;
  origin: string;
  destination: string;
  fare: number | null;
  selected?: boolean;
};

export function FlightFareBar({
  outbound,
  inbound,
  currency = "PKR",
  showReturn,
  isMock = true,
}: {
  outbound: FareBarLeg;
  inbound?: FareBarLeg | null;
  currency?: string;
  showReturn: boolean;
  isMock?: boolean;
}) {
  const outboundFare = outbound.fare;
  const inboundFare = showReturn ? (inbound?.fare ?? null) : null;
  const combined =
    (outboundFare ?? 0) + (showReturn ? (inboundFare ?? 0) : 0);
  const hasAnyFare = outboundFare != null || (showReturn && inboundFare != null);
  const estimated = hasAnyFare ? calculateAgencyMarkup(combined) : null;

  return (
    <aside
      aria-label="Fare summary"
      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
    >
      <div
        className={`grid gap-3 p-3 sm:p-4 ${
          showReturn ? "sm:grid-cols-3" : "sm:grid-cols-2"
        }`}
      >
        <FareBarCell
          label="Outbound"
          date={outbound.date}
          origin={outbound.origin}
          destination={outbound.destination}
          fare={outboundFare}
          currency={currency}
          selected={outbound.selected}
        />
        {showReturn ? (
          <FareBarCell
            label="Return"
            date={inbound?.date ?? ""}
            origin={inbound?.origin ?? ""}
            destination={inbound?.destination ?? ""}
            fare={inboundFare}
            currency={currency}
            selected={inbound?.selected}
          />
        ) : null}
        <div className="min-w-0 rounded-lg bg-white px-3 py-2.5">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
            Total
          </p>
          <p className="mt-1 font-display text-xl text-[var(--color-navy)] tabular-nums">
            {hasAnyFare ? formatPrice(combined, currency) : "—"}
          </p>
          {estimated ? (
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Est. with GB fee {formatPrice(estimated.customerTotal, currency)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Select flights to see the combined fare
            </p>
          )}
        </div>
      </div>
      <p className="border-t border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)] sm:px-4">
        {isMock
          ? "Mock inventory estimate only — not live airline fares. The booking total is recalculated on the server."
          : "Estimated supplier fares. The final booking amount is recalculated on the server before payment."}
      </p>
    </aside>
  );
}

function FareBarCell({
  label,
  date,
  origin,
  destination,
  fare,
  currency,
  selected,
}: {
  label: string;
  date: string;
  origin: string;
  destination: string;
  fare: number | null;
  currency: string;
  selected?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-white px-3 py-2.5">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
        {label}
        {selected ? " · Selected" : ""}
      </p>
      <p className="mt-1 text-sm text-[var(--color-ink)]">
        {date ? formatFlightDate(date) : "—"}
      </p>
      <p className="text-sm font-semibold text-[var(--color-sky)]">
        {origin && destination ? `${origin} → ${destination}` : "—"}
      </p>
      <p className="mt-1 font-display text-lg text-[var(--color-navy)] tabular-nums">
        {fare != null ? formatPrice(fare, currency) : "—"}
      </p>
    </div>
  );
}

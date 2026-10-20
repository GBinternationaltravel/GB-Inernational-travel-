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
  seats = 1,
  infantFare = 0,
}: {
  outbound: FareBarLeg;
  inbound?: FareBarLeg | null;
  currency?: string;
  showReturn: boolean;
  /** Adults + children. Pass supplier fares in `fare`; the total adds the agency amount once. */
  seats?: number;
  /** Infant portion of the supplier fare, so the fee uses the same rule as the result cards. */
  infantFare?: number;
  /** @deprecated Kept so older callers compile. The bar no longer mentions mock inventory. */
  isMock?: boolean;
}) {
  const outboundFare = outbound.fare;
  const inboundFare = showReturn ? (inbound?.fare ?? null) : null;
  const combined =
    (outboundFare ?? 0) + (showReturn ? (inboundFare ?? 0) : 0);
  const hasAnyFare = outboundFare != null || (showReturn && inboundFare != null);
  const estimated = hasAnyFare
    ? calculateAgencyMarkup(combined, { seats, infantFare })
    : null;
  const customerTotal = estimated?.customerTotal ?? null;

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
          selected={outbound.selected}
        />
        {showReturn ? (
          <FareBarCell
            label="Return"
            date={inbound?.date ?? ""}
            origin={inbound?.origin ?? ""}
            destination={inbound?.destination ?? ""}
            fare={inboundFare}
            selected={inbound?.selected}
          />
        ) : null}
        <div className="min-w-0 rounded-lg bg-white px-3 py-2.5">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
            Total
          </p>
          <p className="mt-1 font-display text-xl text-[var(--color-navy)] tabular-nums">
            {customerTotal != null ? formatPrice(customerTotal, currency) : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {customerTotal != null
              ? "Indicative published fare, confirmed when you request a booking."
              : "Select flights to see the published fare."}
          </p>
        </div>
      </div>
      <p className="border-t border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)] sm:px-4">
        Fares are indicative and are confirmed on booking. They are not live airline prices, and a
        request is not a ticket.
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
  selected,
}: {
  label: string;
  date: string;
  origin: string;
  destination: string;
  fare: number | null;
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
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {fare != null ? "Included in the total" : "No published fare for this leg"}
      </p>
    </div>
  );
}

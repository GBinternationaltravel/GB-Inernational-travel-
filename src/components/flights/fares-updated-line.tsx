import { formatFlightDate } from "@/lib/flights/filter-sort";

export function FaresUpdatedLine({ updatedAt }: { updatedAt: string | null }) {
  return (
    <p className="text-sm leading-relaxed text-[var(--color-muted)]">
      {updatedAt ? (
        <>
          Fares last updated: <time dateTime={updatedAt}>{formatFlightDate(updatedAt)}</time>.{" "}
        </>
      ) : (
        <>Fares last updated: the date will show once a published fare has a saved update time. </>
      )}
      Fares are indicative and confirmed on booking. They are not live airline prices, and a request
      is not a ticket.
    </p>
  );
}

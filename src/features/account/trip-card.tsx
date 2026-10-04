import Link from "next/link";
import {
  formatFlightDate,
  formatFlightTime,
  formatPrice,
} from "@/lib/flights/filter-sort";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { eTicketPath, isBookingTicketed } from "@/lib/booking/eticket";
import type { SafeBookingView } from "@/types/booking";
import { snapshotFlightNumber } from "@/lib/flights/flight-number";

export function TripCard({ trip }: { trip: SafeBookingView }) {
  const offer = trip.offer;
  const ticketStatus =
    trip.status === "CONFIRMED"
      ? "Ticket issued"
      : trip.status === "TICKETING_PENDING" || trip.status === "PAYMENT_RECEIVED"
        ? "Ticket issuance pending"
        : trip.status === "CANCELLED"
          ? "Cancelled"
          : "Not issued";
  const ticketed = isBookingTicketed({
    status: trip.status,
    pnr: trip.supplier?.supplierBookingRef,
  });

  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-[var(--color-navy)]">
            {offer.originCity} → {offer.destinationCity}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {formatFlightDate(offer.departureAt)} · {formatFlightTime(offer.departureAt)} →{" "}
            {formatFlightTime(offer.arrivalAt)}
          </p>
          <p className="mt-1 text-sm text-[var(--color-sky)]">
            {offer.airlineName} · {snapshotFlightNumber(offer)}
          </p>
        </div>
        <BookingStatusBadge status={trip.status} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        <div className="text-sm">
          <p>
            Booking: <span className="font-semibold">{trip.reference}</span>
          </p>
          {trip.supplier?.supplierBookingRef ? (
            <p className="text-[var(--color-muted)]">
              PNR: {trip.supplier.supplierBookingRef}
            </p>
          ) : null}
          <p className="text-[var(--color-muted)]">Ticket: {ticketStatus}</p>
          <p className="mt-1 font-semibold text-[var(--color-navy)]">
            {formatPrice(trip.totalAmount, trip.currency)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ticketed ? (
            <Link
              href={eTicketPath(trip.reference)}
              className="inline-flex h-10 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-navy)] hover:bg-[var(--color-surface-muted)]"
            >
              View / print e-ticket
            </Link>
          ) : null}
          <Link
            href={`/my-trips/${encodeURIComponent(trip.reference)}`}
            className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--color-emerald)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-emerald-dark)]"
          >
            View Trip
          </Link>
        </div>
      </div>
    </article>
  );
}

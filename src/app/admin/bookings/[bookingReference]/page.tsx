import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin";
import {
  AdminServiceError,
  getAdminBookingDetail,
} from "@/services/admin-booking-service";
import { AdminStoreBanner } from "@/features/admin/admin-ui";
import { BookingStatusForm } from "@/features/admin/booking-status-form";
import { IssueTicketForm } from "@/features/admin/issue-ticket-form";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { Alert } from "@/components/ui/alert";
import {
  formatFlightDate,
  formatFlightTime,
  formatPrice,
  formatBaggageLabel,
  stopsLabel,
} from "@/lib/flights/filter-sort";
import { getFlightSupplierEnv } from "@/config/flight-supplier";
import { getTicketIssuerMode } from "@/services/ticket-issuer-service";

type Params = { params: Promise<{ bookingReference: string }> };

function maskSupplierOfferRef(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 8) return `${value.slice(0, 2)}…`;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export default async function AdminBookingDetailPage({ params }: Params) {
  const admin = await requireAdminPage("/admin/bookings");
  const { bookingReference } = await params;
  const flightEnv = getFlightSupplierEnv();
  const issuerMode = await getTicketIssuerMode();

  let booking;
  try {
    booking = await getAdminBookingDetail(admin.id, bookingReference);
  } catch (error) {
    if (error instanceof AdminServiceError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const supplierEnvironment =
    booking.supplier.supplierCode === "TRAVELPORT"
      ? flightEnv.travelport.environment === "sandbox"
        ? "Pre-production"
        : "Production"
      : booking.supplier.supplierCode === "MOCK"
        ? "Development"
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/bookings" className="text-sm text-[var(--color-brand)]">
            ← Bookings
          </Link>
          <h1 className="mt-2 font-display text-3xl">{booking.reference}</h1>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <AdminStoreBanner developmentDataStore={booking.developmentDataStore} />

      <Alert variant="warning">{booking.ticketingNote}</Alert>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="font-display text-xl">Supplier</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Item label="Supplier" value={booking.supplier.supplierCode ?? "—"} />
          <Item label="Environment" value={supplierEnvironment ?? "—"} />
          <Item
            label="Supplier offer reference"
            value={maskSupplierOfferRef(booking.supplier.supplierOfferId)}
          />
          <Item
            label="Supplier status"
            value={
              booking.supplier.supplierBookingRef
                ? booking.supplier.supplierBookingStatus ?? "available"
                : booking.supplier.supplierOfferId
                  ? "offer captured — booking not created"
                  : "—"
            }
          />
          <Item
            label="Supplier booking reference"
            value={booking.supplier.supplierBookingRef ?? "—"}
          />
          <Item
            label="Ticketing status"
            value={booking.supplier.supplierTicketingStatus ?? "—"}
          />
          <Item
            label="Offer expires"
            value={
              booking.supplier.offerExpiresAt
                ? formatFlightDate(booking.supplier.offerExpiresAt)
                : "—"
            }
          />
        </dl>
        <Alert variant="info" className="mt-4">
          {booking.supplier.supplierBookingRef
            ? booking.supplier.message
            : "Supplier booking not created."}
        </Alert>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-display text-xl">Booking</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Item label="Reference" value={booking.reference} />
            <Item label="Status" value={booking.status} />
            <Item label="Created" value={formatFlightDate(booking.createdAt)} />
            <Item label="Updated" value={formatFlightDate(booking.updatedAt)} />
            <Item label="Supplier fare" value={formatPrice(booking.supplierFare, booking.currency)} />
            <Item label="Base fare" value={formatPrice(booking.subtotalAmount, booking.currency)} />
            <Item label="Taxes" value={formatPrice(booking.taxesAmount, booking.currency)} />
            <Item
              label="GB markup"
              value={`${formatPrice(booking.feesAmount, booking.currency)}${
                booking.markupRate != null
                  ? ` (${(booking.markupRate * 100).toFixed(booking.markupRate === 0.035 ? 1 : 0)}%)`
                  : ""
              }`}
            />
            <Item label="Customer total" value={formatPrice(booking.totalAmount, booking.currency)} />
          </dl>
          {booking.pricingNotice ? (
            <p className="mt-3 text-xs text-[var(--color-muted)]">{booking.pricingNotice}</p>
          ) : null}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-display text-xl">Flight</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Item label="Origin" value={`${booking.flight.originCity} (${booking.flight.origin})`} />
            <Item
              label="Destination"
              value={`${booking.flight.destinationCity} (${booking.flight.destination})`}
            />
            <Item
              label="Departure"
              value={
                booking.flight.departureAt
                  ? `${formatFlightDate(booking.flight.departureAt)} ${formatFlightTime(booking.flight.departureAt)}`
                  : "—"
              }
            />
            <Item
              label="Arrival"
              value={
                booking.flight.arrivalAt
                  ? `${formatFlightDate(booking.flight.arrivalAt)} ${formatFlightTime(booking.flight.arrivalAt)}`
                  : "—"
              }
            />
            <Item label="Airline" value={booking.flight.airlineName || "—"} />
            <Item label="Flight number" value={booking.flight.flightNumber || "—"} />
            <Item label="Cabin" value={booking.flight.cabinClass} />
            <Item
              label="Baggage"
              value={formatBaggageLabel({
                baggageKg: booking.flight.baggageKg,
                baggageIncluded: booking.flight.baggageKg > 0,
              })}
            />
            <Item label="Stops" value={stopsLabel(booking.flight.stops)} />
          </dl>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-display text-xl">Customer</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Item label="Name" value={booking.customer.name} />
            <Item label="Email" value={booking.customer.email} />
            <Item label="Phone" value={booking.customer.phone || "—"} />
          </dl>
          {booking.customer.id ? (
            <Link
              href={`/admin/customers/${booking.customer.id}`}
              className="mt-3 inline-flex text-sm text-[var(--color-brand)]"
            >
              View customer
            </Link>
          ) : null}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-display text-xl">Passengers</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {booking.passengers.map((passenger) => (
              <li key={passenger.id} className="border-b border-[var(--color-border)] pb-2">
                <p className="font-medium">{passenger.name}</p>
                <p className="text-[var(--color-muted)]">
                  {passenger.type} · {passenger.nationality} · Passport {passenger.passportMasked}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="font-display text-xl">Payments</h2>
        {!booking.payments.length ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">No payment records.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {booking.payments.map((payment) => (
              <div key={payment.id} className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{payment.id}</p>
                  <Link
                    href={`/admin/payments/${payment.id}`}
                    className="text-sm text-[var(--color-brand)]"
                  >
                    Open payment
                  </Link>
                </div>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <Item label="Status" value={payment.status} />
                  <Item label="Provider" value={payment.provider ?? "—"} />
                  <Item label="Provider payment ID" value={payment.providerRef ?? "—"} />
                  <Item label="Amount" value={formatPrice(payment.amount, payment.currency)} />
                  <Item label="Created" value={formatFlightDate(payment.createdAt)} />
                  <Item label="Updated" value={formatFlightDate(payment.updatedAt)} />
                </dl>
                {payment.failureReason ? (
                  <Alert variant="error" className="mt-3">
                    {payment.failureReason}
                  </Alert>
                ) : null}
                <p className="mt-3 text-xs text-[var(--color-muted)]">
                  Attempts: {payment.attempts.length} · Events: {payment.events.length}
                  {payment.isMock ? " · Simulated / development" : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <BookingStatusForm
        reference={booking.reference}
        allowedTransitions={booking.allowedTransitions}
      />

      {(booking.status === "PAYMENT_RECEIVED" ||
        booking.status === "TICKETING_PENDING") && (
        <IssueTicketForm
          bookingReference={booking.reference}
          issuerMode={issuerMode}
        />
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

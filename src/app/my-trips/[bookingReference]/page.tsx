import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getUserTripByReference } from "@/services/trip-service";
import { BookingServiceError } from "@/services/booking-service";
import { Container } from "@/components/ui/container";
import { Alert } from "@/components/ui/alert";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { WeatherWidget } from "@/components/weather/weather-widget";
import { passengerTypeLabels, cabinClasses } from "@/config/booking";
import {
  formatDuration,
  formatFlightDate,
  formatFlightTime,
  formatPrice,
  stopsLabel,
} from "@/lib/flights/filter-sort";
import { buildMetadata } from "@/lib/seo/metadata";
import { getDestinationWeather } from "@/services/weather-service";
import { buildTravelReminderPlan } from "@/services/notification-service";
import { getBookingFlightStatus } from "@/services/flight-status-service";
import { getCityByIata, destinationPath } from "@/data/destinations/catalog";
import { listNotificationsForBooking } from "@/lib/notifications/notification-store";
import { getNotificationEnv } from "@/config/notifications";
import { getWeatherProviderStatus } from "@/services/weather-service";

type Params = { params: Promise<{ bookingReference: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { bookingReference } = await params;
  return {
    ...buildMetadata({
      title: `Trip ${bookingReference}`,
      path: `/my-trips/${bookingReference}`,
      noIndex: true,
    }),
    robots: { index: false, follow: false },
  };
}

export default async function TripDetailsPage({ params }: Params) {
  const user = await requireUser("/my-trips");
  const { bookingReference } = await params;

  let trip;
  try {
    trip = await getUserTripByReference(user.id, bookingReference);
  } catch (error) {
    if (error instanceof BookingServiceError) notFound();
    throw error;
  }

  const offer = trip.offer;
  const cabinLabel =
    cabinClasses.find((item) => item.value === offer.cabinClass)?.label ?? offer.cabinClass;

  const [weather, flightStatus] = await Promise.all([
    getDestinationWeather(offer.destination),
    getBookingFlightStatus({
      bookingReference: trip.reference,
      flightNumber: offer.flightNumber,
      origin: offer.origin,
      destination: offer.destination,
      departureAt: offer.departureAt,
      arrivalAt: offer.arrivalAt,
    }),
  ]);

  const reminders = buildTravelReminderPlan({
    bookingReference: trip.reference,
    departureAt: offer.departureAt,
  });

  const destination = getCityByIata(offer.destination);
  const notificationHistory = await listNotificationsForBooking(
    user.id,
    trip.reference,
  );
  const emailEnv = getNotificationEnv();
  const weatherStatus = getWeatherProviderStatus();

  return (
    <Container className="py-8 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">
            {offer.originCity} → {offer.destinationCity}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Booking {trip.reference}
          </p>
        </div>
        <BookingStatusBadge status={trip.status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
          <h2 className="font-display text-xl">Flight information</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Item label="Origin" value={`${offer.originCity} (${offer.origin})`} />
            <Item label="Destination" value={`${offer.destinationCity} (${offer.destination})`} />
            <Item label="Departure" value={`${formatFlightDate(offer.departureAt)} ${formatFlightTime(offer.departureAt)}`} />
            <Item label="Arrival" value={`${formatFlightDate(offer.arrivalAt)} ${formatFlightTime(offer.arrivalAt)}`} />
            <Item label="Duration" value={formatDuration(offer.durationMinutes)} />
            <Item label="Stops" value={stopsLabel(offer.stops)} />
            <Item label="Airline" value={offer.airlineName} />
            <Item label="Flight number" value={offer.flightNumber} />
            <Item label="Cabin" value={cabinLabel} />
            <Item label="Baggage" value={`${offer.baggageKg} KG`} />
          </dl>
        </section>

        <section className="space-y-4">
          <WeatherWidget forecast={weather} compact />
          {destination ? (
            <Link
              href={destinationPath(destination.countrySlug, destination.citySlug)}
              className="inline-flex text-sm font-medium text-[var(--color-brand)]"
            >
              View {destination.cityName} destination guide
            </Link>
          ) : null}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
          <h2 className="font-display text-xl">Booking status</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Item label="Booking reference" value={trip.reference} />
            <Item label="Booking status" value={trip.status} />
            <Item
              label="Created"
              value={trip.createdAt ? formatFlightDate(trip.createdAt) : "—"}
            />
          </dl>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
          <h2 className="font-display text-xl">Passengers</h2>
          <Alert variant="info" className="mt-3">
            Full passport numbers are never shown. Only masked endings are visible.
          </Alert>
          <ul className="mt-4 space-y-3">
            {trip.passengers.map((passenger) => (
              <li key={passenger.id} className="border-b border-[var(--color-border)] pb-3 text-sm">
                <p className="font-medium">
                  {passenger.firstName}
                  {passenger.middleName ? ` ${passenger.middleName}` : ""} {passenger.lastName}
                </p>
                <p className="text-[var(--color-muted)]">
                  {passengerTypeLabels[passenger.type as keyof typeof passengerTypeLabels] ??
                    passenger.type}{" "}
                  · {passenger.nationality} · Passport ending in {passenger.passportMasked}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5 lg:col-span-2">
          <h2 className="font-display text-xl">Contact & price</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Item label="Email" value={trip.contactEmailMasked} />
            <Item label="Phone" value={trip.contactPhoneMasked} />
            <Item label="Base fare" value={formatPrice(trip.subtotalAmount, trip.currency)} />
            <Item label="Taxes" value={formatPrice(trip.taxesAmount, trip.currency)} />
            <Item label="GB service fee" value={formatPrice(trip.feesAmount, trip.currency)} />
            <Item label="Total" value={formatPrice(trip.totalAmount, trip.currency)} />
          </dl>
          <Alert variant="warning" className="mt-4">
            {trip.pricingNotice}
          </Alert>
          <Alert variant="info" className="mt-3">
            Payment card numbers, CVV, and gateway secrets are never stored or shown on this page.
          </Alert>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <h2 className="font-display text-xl">Payment & ticketing</h2>
        {(trip.status === "PAYMENT_RECEIVED" || trip.status === "TICKETING_PENDING") && (
          <Alert variant="warning" className="mt-4">
            Payment received. Your booking is awaiting ticket confirmation.
            {trip.supplier.supplierBookingRef
              ? " A supplier reservation reference is on file, but this is not an issued airline ticket."
              : " No airline ticket, PNR, or boarding pass has been issued yet."}
          </Alert>
        )}
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <Item label="Payment / booking status" value={trip.status} />
          <Item
            label="Supplier booking status"
            value={trip.supplier.supplierBookingStatus ?? "Supplier booking not created."}
          />
          <Item
            label="Ticketing status"
            value={trip.supplier.supplierTicketingStatus ?? "Not ticketed"}
          />
          <Item
            label="Supplier booking reference"
            value={trip.supplier.supplierBookingRef ?? "—"}
          />
        </dl>
        {trip.status === "PAYMENT_PROCESSING" && (
          <Alert variant="info" className="mt-4">
            Payment is processing. We will update this trip once the payment provider
            confirms the result.
          </Alert>
        )}
        {trip.status === "PENDING_PAYMENT" && (
          <Alert variant="info" className="mt-4">
            Payment is still outstanding for this booking.
          </Alert>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <h2 className="font-display text-xl">Travel reminders</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Reminder schedule for this trip.
          {emailEnv.useLive
            ? " Email delivery is configured for the reminder engine."
            : " Email currently uses development console delivery until a live email provider is configured."}
          {weatherStatus.liveConfigured
            ? " Destination weather can use the live weather provider."
            : " Destination weather uses sample data until a live weather provider is configured."}
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {reminders.reminders.map((item) => (
            <li
              key={`${item.eventType}-${item.scheduledFor}`}
              className="border-b border-[var(--color-border)] pb-3"
            >
              <p className="font-medium">{item.description}</p>
              <p className="text-[var(--color-muted)]">
                Planned for {formatFlightDate(item.scheduledFor)}{" "}
                {formatFlightTime(item.scheduledFor)}
              </p>
            </li>
          ))}
        </ul>

        {notificationHistory.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-medium">Notifications for this trip</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {notificationHistory.slice(0, 8).map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2"
                >
                  <span>
                    {item.subject} · {item.category}
                    {item.unread ? " · unread" : ""}
                  </span>
                  <span className="text-[var(--color-muted)]">{item.status}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/account/notifications"
              className="mt-3 inline-flex text-sm text-[var(--color-brand)]"
            >
              Open notification center
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            No reminder or email delivery attempts recorded for this booking yet.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <h2 className="font-display text-xl">Flight status</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{flightStatus.statusLabel}</p>
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950">
            {flightStatus.dataLabel}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Item label="Flight" value={flightStatus.flightNumber} />
          <Item label="Route" value={`${flightStatus.origin} → ${flightStatus.destination}`} />
          <Item
            label="Delay"
            value={
              typeof flightStatus.delayMinutes === "number" && flightStatus.delayMinutes > 0
                ? `${flightStatus.delayMinutes} min`
                : "—"
            }
          />
          <Item
            label="Gate / terminal"
            value={
              [flightStatus.gate, flightStatus.terminal].filter(Boolean).join(" · ") ||
              "—"
            }
          />
        </dl>
        <Alert variant="warning" className="mt-4">
          {flightStatus.notice}
        </Alert>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link
            href={`/flight-status?flight=${encodeURIComponent(offer.flightNumber)}&date=${encodeURIComponent(offer.departureAt.slice(0, 10))}`}
            className="font-medium text-[var(--color-brand)]"
          >
            Open flight status lookup
          </Link>
          <Link href="/account/notifications" className="font-medium text-[var(--color-brand)]">
            Notification center
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
        <h2 className="font-display text-xl">Important travel information</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--color-muted)]">
          <li>Arrive at the airport with enough time for security and document checks.</li>
          <li>Carry the same travel documents used for this booking.</li>
          <li>
            Payment received does not mean an airline ticket is issued until ticketing status
            confirms it.
          </li>
          <li>
            Destination weather on this page may be sample data — check the weather label before
            relying on it.
          </li>
        </ul>
      </section>

      <section className="mt-6 flex flex-wrap gap-3">
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(
            `GB International Travel\nBooking ${trip.reference}\n${offer.originCity} to ${offer.destinationCity}\nStatus: ${trip.status}\nTotal: ${trip.currency} ${trip.totalAmount}`,
          )}`}
          download={`${trip.reference}-summary.txt`}
          className="inline-flex h-11 items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium"
        >
          Download booking summary
        </a>
        {trip.status === "PENDING_PAYMENT" ||
        trip.status === "DRAFT" ||
        trip.status === "PAYMENT_PROCESSING" ||
        trip.status === "FAILED" ? (
          <Link
            href={`/booking/payment?ref=${encodeURIComponent(trip.reference)}`}
            className="inline-flex h-11 items-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
          >
            Continue payment
          </Link>
        ) : null}
        {trip.status === "PAYMENT_RECEIVED" || trip.status === "TICKETING_PENDING" ? (
          <Link
            href={`/booking/confirmation?ref=${encodeURIComponent(trip.reference)}`}
            className="inline-flex h-11 items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium"
          >
            View payment confirmation
          </Link>
        ) : null}
        <Link
          href="/contact"
          className="inline-flex h-11 items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium"
        >
          Contact support
        </Link>
      </section>
    </Container>
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

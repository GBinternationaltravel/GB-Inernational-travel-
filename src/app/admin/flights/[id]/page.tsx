import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin";
import { CmsEntityForm } from "@/features/admin/cms-form";
import { formatFlightDate, formatFlightTime } from "@/lib/flights/filter-sort";
import { AdminServiceError } from "@/services/admin-booking-service";
import { getAdminFlight } from "@/services/admin-cms-service";

type Params = { params: Promise<{ id: string }> };

export default async function AdminFlightDetailPage({ params }: Params) {
  await requireAdminPage("/admin/flights");
  const { id } = await params;

  let flight;
  try {
    flight = await getAdminFlight(id);
  } catch (error) {
    if (error instanceof AdminServiceError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/flights" className="text-sm text-[var(--color-brand)]">
          ← Back to flights
        </Link>
        <h1 className="mt-2 font-display text-3xl">{flight.flightNumber}</h1>
        <p className="text-sm text-[var(--color-muted)]">
          {flight.airline.iataCode} · {flight.airline.name} · {flight.status}
        </p>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-4">
        <h2 className="font-display text-xl">Segments</h2>
        {flight.segments.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">No segments recorded.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {flight.segments.map((segment) => (
              <li
                key={segment.id}
                className="border-b border-[var(--color-border)] pb-2 last:border-0"
              >
                <span className="font-medium">
                  {segment.originAirport.iataCode} → {segment.destinationAirport.iataCode}
                </span>
                <span className="text-[var(--color-muted)]">
                  {" "}
                  · {formatFlightDate(segment.departureAt.toISOString())}{" "}
                  {formatFlightTime(segment.departureAt.toISOString())} →{" "}
                  {formatFlightDate(segment.arrivalAt.toISOString())}{" "}
                  {formatFlightTime(segment.arrivalAt.toISOString())}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CmsEntityForm
        title="Update status"
        endpoint={`/api/admin/flights/${flight.id}/status`}
        method="POST"
        submitLabel="Save status"
        fields={[
          {
            name: "status",
            label: "Status",
            type: "select",
            defaultValue: flight.status,
            required: true,
            options: [
              { value: "SCHEDULED", label: "Scheduled" },
              { value: "BOARDING", label: "Boarding" },
              { value: "DELAYED", label: "Delayed" },
              { value: "DEPARTED", label: "Departed" },
              { value: "ARRIVED", label: "Arrived" },
              { value: "CANCELLED", label: "Cancelled" },
            ],
          },
        ]}
      />

      {flight.tickets.length > 0 ? (
        <section className="rounded-xl border border-[var(--color-border)] bg-white p-4">
          <h2 className="font-display text-xl">Related tickets</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {flight.tickets.map((ticket) => (
              <li key={ticket.id}>
                {ticket.ticketNumber ?? ticket.id}
                {ticket.pnr ? ` · PNR ${ticket.pnr}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

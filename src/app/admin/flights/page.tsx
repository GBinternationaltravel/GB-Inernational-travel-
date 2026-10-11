import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminPagination } from "@/features/admin/admin-tables";
import { CmsEntityForm, CmsToggleButton } from "@/features/admin/cms-form";
import { serviceFeePerSeat } from "@/lib/booking/pricing";
import { formatFlightDate, formatPrice } from "@/lib/flights/filter-sort";
import { AdminServiceError } from "@/services/admin-booking-service";
import { getAdminFlight, listAdminFlights } from "@/services/admin-cms-service";
import {
  formatDaysOfWeek,
  getInventoryFormOptions,
  loadInventoryMeta,
} from "@/services/flight-inventory-service";
import { formatFlightNumber } from "@/lib/flights/flight-number";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FLIGHT_STATUSES = [
  "SCHEDULED",
  "BOARDING",
  "DELAYED",
  "DEPARTED",
  "ARRIVED",
  "CANCELLED",
] as const;

const CABIN_OPTIONS = [
  { value: "ECONOMY", label: "Economy" },
  { value: "PREMIUM_ECONOMY", label: "Premium economy" },
  { value: "BUSINESS", label: "Business" },
  { value: "FIRST", label: "First" },
];

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cabinLabel(value: string) {
  return CABIN_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export default async function AdminFlightsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/flights");
  const params = await searchParams;
  const query = one(params.query) ?? "";
  const status = one(params.status) ?? "";
  const page = Number(one(params.page) ?? "1") || 1;
  const editId = one(params.edit);

  const [data, options] = await Promise.all([
    listAdminFlights({ page, query, status: status || undefined }),
    getInventoryFormOptions(),
  ]);

  let editing: Awaited<ReturnType<typeof getAdminFlight>> | undefined;
  if (editId) {
    try {
      editing = await getAdminFlight(editId);
    } catch (error) {
      if (!(error instanceof AdminServiceError && error.code === "NOT_FOUND")) throw error;
    }
  }

  const metas = await loadInventoryMeta([
    ...data.items.map((item) => item.id),
    ...(editing ? [editing.id] : []),
  ]);
  const editingMeta = editing ? metas.get(editing.id) : undefined;
  const editingSegment = editing?.segments[0];

  const airlineOptions = [
    { value: "", label: "Select airline" },
    ...options.airlines.map((a) => ({ value: a.id, label: `${a.iataCode} · ${a.name}` })),
  ];
  const airportOptions = (placeholder: string) => [
    { value: "", label: placeholder },
    ...options.airports.map((a) => ({ value: a.iataCode, label: `${a.iataCode} · ${a.name}` })),
  ];
  const yesNo = (yes: string, no: string) => [
    { value: "true", label: yes },
    { value: "false", label: no },
  ];
  const listHref = `/admin/flights?query=${encodeURIComponent(query)}&status=${status}&page=${page}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Flights</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Flights added here are what customers find in flight search. Bookings are confirmed
          and ticketed from Bookings → Issue Ticket.
        </p>
      </div>

      <CmsEntityForm
        key={editing?.id ?? "new"}
        title={editing ? `Edit ${formatFlightNumber(editing.flightNumber, editing.airline.iataCode)}` : "Add flight"}
        endpoint="/api/admin/flights"
        method={editing ? "PATCH" : "POST"}
        submitLabel={editing ? "Update flight" : "Create flight"}
        extraPayload={editing ? { id: editing.id } : undefined}
        fields={[
          {
            name: "airlineId",
            label: "Airline",
            type: "select",
            required: true,
            defaultValue: editing?.airlineId ?? "",
            options: airlineOptions,
          },
          {
            name: "flightNumber",
            label: "Flight number",
            required: true,
            placeholder: "PK451",
            defaultValue: editing
              ? formatFlightNumber(editing.flightNumber, editing.airline.iataCode)
              : "",
          },
          {
            name: "originCode",
            label: "From",
            type: "select",
            required: true,
            defaultValue: editingSegment?.originAirport.iataCode ?? "",
            options: airportOptions("Select origin"),
          },
          {
            name: "destinationCode",
            label: "To",
            type: "select",
            required: true,
            defaultValue: editingSegment?.destinationAirport.iataCode ?? "",
            options: airportOptions("Select destination"),
          },
          {
            name: "departureTime",
            label: "Departure time (local, 24h)",
            required: true,
            placeholder: "07:30",
            defaultValue: editingMeta?.departureTime ?? "",
          },
          {
            name: "arrivalTime",
            label: "Arrival time (local, 24h)",
            required: true,
            placeholder: "09:15",
            defaultValue: editingMeta?.arrivalTime ?? "",
          },
          {
            name: "startDate",
            label: "Flight date (or first day of a weekly schedule)",
            type: "date",
            required: true,
            defaultValue: editingMeta?.startDate ?? "",
          },
          {
            name: "daysOfWeek",
            label: "Repeats on (blank = this date only)",
            placeholder: "Mon, Wed, Fri  or  Daily",
            defaultValue: editingMeta ? formatDaysOfWeek(editingMeta.daysOfWeek) : "",
          },
          {
            name: "endDate",
            label: "Weekly schedule ends (optional)",
            type: "date",
            defaultValue: editingMeta?.endDate ?? "",
          },
          {
            name: "cabinClass",
            label: "Cabin",
            type: "select",
            required: true,
            defaultValue: editing?.cabinClass ?? "ECONOMY",
            options: CABIN_OPTIONS,
          },
          {
            name: "fare",
            label: "Base fare per seat (PKR)",
            type: "number",
            required: true,
            step: "1",
            placeholder: "18500",
            defaultValue: editingMeta?.fare ?? "",
          },
          {
            name: "taxes",
            label: "Taxes per seat (PKR)",
            type: "number",
            step: "1",
            placeholder: "0",
            defaultValue: editingMeta?.taxes ?? "",
          },
          {
            name: "infantFare",
            label: "Infant fare (PKR, blank = 10% of fare)",
            type: "number",
            step: "1",
            defaultValue: editingMeta?.infantFare ?? "",
          },
          {
            name: "seats",
            label: "Seats for sale per departure",
            type: "number",
            required: true,
            step: "1",
            placeholder: "20",
            defaultValue: editingMeta?.seats ?? "",
          },
          {
            name: "baggageKg",
            label: "Checked baggage (kg)",
            type: "number",
            step: "1",
            placeholder: "20",
            defaultValue: editingMeta?.baggageKg ?? 20,
          },
          {
            name: "aircraftCode",
            label: "Aircraft (optional)",
            placeholder: "ATR72",
            defaultValue: editingSegment?.aircraftCode ?? "",
          },
          {
            name: "refundable",
            label: "Refundable",
            type: "select",
            defaultValue: editingMeta?.refundable ?? false,
            options: yesNo("Refundable", "Non-refundable"),
          },
          {
            name: "isActive",
            label: "Bookable",
            type: "select",
            defaultValue: editingMeta?.isActive ?? true,
            options: yesNo("Active (shown in search)", "Inactive (hidden)"),
          },
          {
            name: "fareNotes",
            label: "Fare rules / notes shown to customers (optional)",
            type: "textarea",
            rows: 2,
            defaultValue: editingMeta?.fareNotes ?? "",
          },
        ]}
      >
        <p className="text-sm text-[var(--color-muted)]">
          Times are local at each airport (arrival the next day is detected automatically).
          Customers pay fare + taxes per seat plus the GB service fee, added at checkout: PKR
          1,000 per seat when fare + taxes is up to PKR 30,000, PKR 1,500 up to PKR 100,000, and
          PKR 2,500 above PKR 100,000 (adults and children; no fee on infants).
          {editing ? (
            <>
              {" "}
              <Link href={listHref} className="text-[var(--color-brand)]">
                Cancel edit
              </Link>
            </>
          ) : null}
        </p>
      </CmsEntityForm>

      <form className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 md:grid-cols-4">
        <input
          name="query"
          defaultValue={query}
          placeholder="Flight number or airline"
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm md:col-span-2"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          <option value="">All statuses</option>
          {FLIGHT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>

      {data.items.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-border)] bg-white p-6 text-sm text-[var(--color-muted)]">
          No flights found. Add one above to make it available in flight search.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">Flight</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Schedule</th>
                <th className="px-3 py-2">Cabin</th>
                <th className="px-3 py-2">Fare / seat</th>
                <th className="px-3 py-2">Seats</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const first = item.segments[0];
                const last = item.segments[item.segments.length - 1];
                const meta = metas.get(item.id);
                const route =
                  first && last
                    ? `${first.originAirport.iataCode} → ${last.destinationAirport.iataCode}`
                    : "—";
                const schedule = meta
                  ? meta.daysOfWeek.length > 0
                    ? `${formatDaysOfWeek(meta.daysOfWeek)} · from ${formatFlightDate(meta.startDate)}${
                        meta.endDate ? ` to ${formatFlightDate(meta.endDate)}` : ""
                      }`
                    : formatFlightDate(meta.startDate)
                  : "—";
                const bookable = Boolean(meta?.isActive) && item.status !== "CANCELLED";
                return (
                  <tr key={item.id} className="border-b border-[var(--color-border)] align-top">
                    <td className="px-3 py-2">
                      <span className="font-medium">
                        {formatFlightNumber(item.flightNumber, item.airline.iataCode)}
                      </span>
                      <span className="block text-xs text-[var(--color-muted)]">
                        {item.airline.name}
                      </span>
                    </td>
                    <td className="px-3 py-2">{route}</td>
                    <td className="px-3 py-2">
                      {schedule}
                      {meta ? (
                        <span className="block text-xs text-[var(--color-muted)]">
                          {meta.departureTime} → {meta.arrivalTime}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{cabinLabel(item.cabinClass)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {meta ? formatPrice(meta.fare + meta.taxes, "PKR") : "—"}
                      {meta ? (
                        <span className="block text-xs text-[var(--color-muted)]">
                          Customer pays{" "}
                          {formatPrice(
                            meta.fare + meta.taxes + serviceFeePerSeat(meta.fare + meta.taxes).feePerSeat,
                            "PKR",
                          )}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{meta ? meta.seats : "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          bookable
                            ? "font-medium text-[var(--color-emerald)]"
                            : "text-[var(--color-muted)]"
                        }
                      >
                        {meta ? (bookable ? "Active" : "Inactive") : "No fare set"}
                      </span>
                      <span className="block text-xs text-[var(--color-muted)]">{item.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/flights?edit=${item.id}&query=${encodeURIComponent(query)}&status=${status}&page=${page}`}
                          className="text-[var(--color-brand)]"
                        >
                          Edit
                        </Link>
                        {meta ? (
                          <CmsToggleButton
                            endpoint="/api/admin/flights"
                            payload={{ action: "set-active", id: item.id, isActive: !meta.isActive }}
                            label={meta.isActive ? "Deactivate" : "Activate"}
                            variant={meta.isActive ? "secondary" : "primary"}
                          />
                        ) : null}
                        <Link
                          href={`/admin/flights/${item.id}`}
                          className="text-[var(--color-brand)]"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination
        page={data.page}
        totalPages={data.pageCount}
        basePath="/admin/flights"
        params={{ query, status: status || undefined }}
      />
    </div>
  );
}

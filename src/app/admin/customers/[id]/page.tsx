import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getAdminCustomerDetail,
} from "@/services/admin-customer-service";
import { AdminServiceError } from "@/services/admin-booking-service";
import { AdminStoreBanner } from "@/features/admin/admin-ui";
import { CustomerActiveForm } from "@/features/admin/customer-active-form";
import { CustomerRoleForm } from "@/features/admin/customer-role-form";
import { Alert } from "@/components/ui/alert";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { formatFlightDate, formatPrice } from "@/lib/flights/filter-sort";

type Params = { params: Promise<{ id: string }> };

export default async function AdminCustomerDetailPage({ params }: Params) {
  const admin = await requireAdminPage("/admin/customers", {
    permissions: "customers.manage",
  });
  const { id } = await params;

  let customer;
  try {
    customer = await getAdminCustomerDetail(admin.id, id);
  } catch (error) {
    if (error instanceof AdminServiceError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const canManageRoles = hasPermission(admin.role, "permissions.manage");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-[var(--color-brand)]">
          ← Customers
        </Link>
        <h1 className="mt-2 font-display text-3xl">{customer.name}</h1>
        <p className="text-sm text-[var(--color-muted)]">
          {customer.email} · {customer.isActive ? "Active" : "Disabled"} · {customer.role}
        </p>
      </div>

      <AdminStoreBanner developmentDataStore={customer.developmentDataStore} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-display text-xl">Profile</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Item label="Email" value={customer.email} />
            <Item label="Phone" value={customer.phone} />
            <Item label="Role" value={customer.role} />
            <Item label="Created" value={formatFlightDate(customer.createdAt)} />
            <Item label="Updated" value={formatFlightDate(customer.updatedAt)} />
            <Item label="Currency" value={customer.preferredCurrency} />
            <Item label="Language" value={customer.preferredLanguage} />
          </dl>
          {canManageRoles ? (
            <CustomerRoleForm customerId={customer.id} currentRole={customer.role} />
          ) : null}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-display text-xl">Payment history summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Item label="Total payments" value={String(customer.paymentSummary.totalPayments)} />
            <Item label="Paid" value={String(customer.paymentSummary.paidCount)} />
            <Item label="Failed" value={String(customer.paymentSummary.failedCount)} />
            <Item
              label="Total paid amount"
              value={formatPrice(
                customer.paymentSummary.totalPaidAmount,
                customer.preferredCurrency,
              )}
            />
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="font-display text-xl">Bookings</h2>
        {!customer.bookings.length ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">No bookings linked.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {customer.bookings.map((booking) => (
              <li
                key={booking.reference}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3 text-sm"
              >
                <div>
                  <Link
                    href={`/admin/bookings/${encodeURIComponent(booking.reference)}`}
                    className="font-medium text-[var(--color-brand)]"
                  >
                    {booking.reference}
                  </Link>
                  <p className="text-[var(--color-muted)]">{booking.route}</p>
                </div>
                <div className="text-right">
                  <BookingStatusBadge status={booking.status} />
                  <p className="mt-1">{formatPrice(booking.amount, booking.currency)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CustomerActiveForm customerId={customer.id} isActive={customer.isActive} />
      <Alert variant="info">{customer.resetPasswordNote}</Alert>
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

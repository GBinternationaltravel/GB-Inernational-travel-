import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminDashboard } from "@/services/admin-booking-service";
import { AdminStoreBanner, MetricCard } from "@/features/admin/admin-ui";
import { AdminBookingsTable } from "@/features/admin/admin-tables";

export default async function AdminDashboardPage() {
  const admin = await requireAdminPage("/admin");
  const data = await getAdminDashboard(admin.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-navy)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Operations overview from stored booking and payment data.
        </p>
      </div>

      <AdminStoreBanner developmentDataStore={data.developmentDataStore} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Bookings" value={data.metrics.totalBookings} tone="info" />
        <MetricCard label="Payment Received" value={data.metrics.paymentReceived} tone="success" />
        <MetricCard label="Pending Payment" value={data.metrics.pendingPayment} tone="warning" />
        <MetricCard
          label="Pending Tickets"
          value={data.metrics.ticketingPending}
          tone="premium"
        />
        <MetricCard label="Cancellations" value={data.metrics.cancelled} />
        <MetricCard label="Customers" value={data.metrics.customers} tone="info" />
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-xl font-semibold text-[var(--color-navy)]">Requires Attention</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Attention
            label="Payment Pending"
            value={data.requiresAttention.paymentPending}
            href="/admin/bookings?bookingStatus=PENDING_PAYMENT"
          />
          <Attention
            label="Payment Received / Ticketing Pending"
            value={data.requiresAttention.paymentReceivedOrTicketing}
            href="/admin/bookings?bookingStatus=PAYMENT_RECEIVED"
          />
          <Attention
            label="Failed Payments"
            value={data.requiresAttention.failedPayments}
            href="/admin/payments?status=FAILED"
          />
          <Attention
            label="Expired Bookings"
            value={data.requiresAttention.expiredBookings}
            href="/admin/bookings?bookingStatus=EXPIRED"
          />
          <Attention
            label="Cancelled Bookings"
            value={data.requiresAttention.cancelledBookings}
            href="/admin/bookings?bookingStatus=CANCELLED"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-navy)]">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-sm font-semibold text-[var(--color-sky)]">
            View all
          </Link>
        </div>
        <AdminBookingsTable items={data.recentBookings} />
      </section>
    </div>
  );
}

function Attention({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[#f8fafc] p-3 transition-colors hover:border-[var(--color-sky)]"
    >
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--color-navy)]">{value}</p>
    </Link>
  );
}

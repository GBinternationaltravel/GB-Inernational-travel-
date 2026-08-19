import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminPaymentDetail } from "@/services/admin-payment-service";
import { AdminServiceError } from "@/services/admin-booking-service";
import { AdminStoreBanner } from "@/features/admin/admin-ui";
import { PaymentActionsForm } from "@/features/admin/payment-actions-form";
import { Alert } from "@/components/ui/alert";
import { formatFlightDate, formatPrice } from "@/lib/flights/filter-sort";

type Params = { params: Promise<{ id: string }> };

export default async function AdminPaymentDetailPage({ params }: Params) {
  const admin = await requireAdminPage("/admin/payments");
  const { id } = await params;

  let payment;
  try {
    payment = await getAdminPaymentDetail(admin.id, id);
  } catch (error) {
    if (error instanceof AdminServiceError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/payments" className="text-sm text-[var(--color-brand)]">
          ← Payments
        </Link>
        <h1 className="mt-2 font-display text-3xl">Payment detail</h1>
        <p className="font-mono text-sm text-[var(--color-muted)]">{payment.id}</p>
      </div>

      <AdminStoreBanner developmentDataStore={payment.developmentDataStore} />
      <Alert variant="info">{payment.refundNote}</Alert>
      {payment.isMock ? (
        <Alert variant="warning">Simulated / development payment — no real charge.</Alert>
      ) : null}

      <PaymentActionsForm
        paymentId={payment.id}
        canVerify={payment.canVerify}
        canRefund={payment.canRefund}
        existingProviderRef={payment.providerRef}
      />

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Item label="Status" value={payment.status} />
          <Item
            label="Booking"
            value={payment.bookingReference ?? "—"}
            href={
              payment.bookingReference
                ? `/admin/bookings/${encodeURIComponent(payment.bookingReference)}`
                : undefined
            }
          />
          <Item label="Provider" value={payment.provider ?? "—"} />
          <Item label="Provider payment ID" value={payment.providerRef ?? "—"} />
          <Item label="Amount" value={formatPrice(payment.amount, payment.currency)} />
          <Item label="Created" value={formatFlightDate(payment.createdAt)} />
          <Item label="Updated" value={formatFlightDate(payment.updatedAt)} />
          <Item
            label="Paid at"
            value={payment.paidAt ? formatFlightDate(payment.paidAt) : "—"}
          />
        </dl>
        {payment.failureReason ? (
          <Alert variant="error" className="mt-4">
            {payment.failureReason}
          </Alert>
        ) : null}
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="font-display text-xl">Attempts</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {payment.attempts.map((attempt) => (
            <li key={attempt.id} className="border-b border-[var(--color-border)] pb-2">
              #{attempt.attemptNumber} · {attempt.status} · {attempt.provider}
              {attempt.providerCheckoutId ? ` · ${attempt.providerCheckoutId}` : ""}
            </li>
          ))}
          {!payment.attempts.length ? (
            <li className="text-[var(--color-muted)]">No attempts recorded.</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="font-display text-xl">Webhook events</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {payment.events.map((event) => (
            <li key={event.id} className="border-b border-[var(--color-border)] pb-2">
              {event.eventType} · signature {event.signatureValid ? "valid" : "invalid"} ·{" "}
              {event.processed ? "processed" : "unprocessed"}
              {event.processingResult ? ` · ${event.processingResult}` : ""}
            </li>
          ))}
          {!payment.events.length ? (
            <li className="text-[var(--color-muted)]">No webhook events.</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="font-display text-xl">Timeline</h2>
        <ol className="mt-3 space-y-3 text-sm">
          {payment.timeline.map((item, index) => (
            <li key={`${item.at}-${index}`} className="border-l-2 border-[var(--color-brand)] pl-3">
              <p className="font-medium">{item.label}</p>
              <p className="text-[var(--color-muted)]">
                {formatFlightDate(item.at)} · {item.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Item({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="font-medium">
        {href ? (
          <Link href={href} className="text-[var(--color-brand)]">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

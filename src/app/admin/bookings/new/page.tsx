import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { CreateBookingForm } from "@/features/admin/create-booking-form";

export default async function AdminCreateBookingPage() {
  await requireAdminPage("/admin/bookings/new", { permissions: "bookings.create" });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-[var(--color-muted)]">
          <Link href="/admin/bookings" className="text-[var(--color-sky)] hover:underline">
            Bookings
          </Link>
          {" / "}
          Create
        </p>
        <h1 className="font-display text-3xl">Create booking</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          For customers who contact GB International Travel by phone or WhatsApp. The booking
          starts as pending payment. Record payment and issue the ticket on the booking page
          after this.
        </p>
      </div>
      <CreateBookingForm />
    </div>
  );
}

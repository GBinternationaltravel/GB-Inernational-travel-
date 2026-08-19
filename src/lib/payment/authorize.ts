import { getCurrentUser } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/auth/permissions";
import { readBookingSessionCookie } from "@/lib/booking/session-cookie";
import { verifyAccessToken } from "@/lib/booking/reference";
import type { StoredBooking } from "@/lib/booking/repository";
import { getBookingRepository } from "@/lib/booking/get-repository";

export type AuthorizedBookingAccess = {
  booking: StoredBooking;
  mode: "guest_session" | "account_owner" | "staff";
  userId?: string;
};

/**
 * Authorizes payment actions for a guest booking session or owning customer.
 */
export async function authorizeBookingPaymentAccess(
  reference: string,
): Promise<AuthorizedBookingAccess | null> {
  const { repo } = await getBookingRepository();
  const booking = await repo.findByReference(reference);
  if (!booking) return null;

  const user = await getCurrentUser();
  if (user && isStaffRole(user.role)) {
    return { booking, mode: "staff", userId: user.id };
  }
  if (user && booking.userId && booking.userId === user.id) {
    return { booking, mode: "account_owner", userId: user.id };
  }

  const session = await readBookingSessionCookie();
  if (
    session &&
    session.reference === reference &&
    verifyAccessToken(session.token, booking.accessTokenHash)
  ) {
    return { booking, mode: "guest_session", userId: user?.id };
  }

  return null;
}

export async function authorizePaymentRecordAccess(
  bookingId: string,
): Promise<AuthorizedBookingAccess | null> {
  const { repo } = await getBookingRepository();
  const booking = await repo.findById(bookingId);
  if (!booking) return null;
  return authorizeBookingPaymentAccess(booking.reference);
}

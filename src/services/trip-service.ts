import type { BookingStatus } from "@prisma/client";
import { getBookingRepository } from "@/lib/booking/get-repository";
import type { StoredBooking } from "@/lib/booking/repository";
import { verifyAccessToken } from "@/lib/booking/reference";
import type { SafeBookingView } from "@/types/booking";
import { BookingServiceError } from "@/services/booking-service";
import { toSafeBookingView } from "@/lib/booking/to-safe-view";

const upcomingStatuses: BookingStatus[] = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "PAYMENT_RECEIVED",
  "TICKETING_PENDING",
  "CONFIRMED",
];

function isPastTrip(booking: StoredBooking): boolean {
  if (["CANCELLED", "FAILED", "EXPIRED", "REFUNDED"].includes(booking.status)) {
    return true;
  }
  const departure = booking.offerSnapshot?.departureAt;
  if (!departure) return false;
  return new Date(departure).getTime() < Date.now();
}

function toTripView(booking: StoredBooking, store: "prisma" | "file"): SafeBookingView {
  return toSafeBookingView(booking, store);
}

export async function listUserTrips(userId: string): Promise<{
  upcoming: SafeBookingView[];
  past: SafeBookingView[];
  store: "prisma" | "file";
}> {
  const { repo, kind } = await getBookingRepository();
  const bookings = await repo.listByUserId(userId);
  const views = bookings.map((booking) => toTripView(booking, kind));

  const upcoming = views.filter((booking) => {
    const raw = bookings.find((item) => item.reference === booking.reference);
    if (!raw) return false;
    return upcomingStatuses.includes(raw.status) && !isPastTrip(raw);
  });

  const past = views.filter((booking) => {
    const raw = bookings.find((item) => item.reference === booking.reference);
    if (!raw) return false;
    return isPastTrip(raw) || !upcomingStatuses.includes(raw.status);
  });

  return { upcoming, past, store: kind };
}

export async function getUserTripByReference(
  userId: string,
  reference: string,
): Promise<SafeBookingView> {
  const { repo, kind } = await getBookingRepository();
  const booking = await repo.findByReference(reference);
  if (!booking || booking.userId !== userId) {
    throw new BookingServiceError(
      "We couldn't find this trip in your account.",
      "SESSION_NOT_FOUND",
    );
  }
  return toTripView(booking, kind);
}

/** Guest recovery: reference + session access token (never email in URL). */
export async function recoverGuestBooking(
  reference: string,
  accessToken: string,
): Promise<SafeBookingView> {
  const { repo, kind } = await getBookingRepository();
  const booking = await repo.findByReference(reference);
  if (!booking || !verifyAccessToken(accessToken, booking.accessTokenHash)) {
    throw new BookingServiceError(
      "We couldn't verify this booking session.",
      "SESSION_NOT_FOUND",
    );
  }
  return toTripView(booking, kind);
}

export async function claimBookingForUser(
  userId: string,
  reference: string,
  accessToken: string,
): Promise<SafeBookingView> {
  const { repo, kind } = await getBookingRepository();
  const booking = await repo.findByReference(reference);
  if (!booking || !verifyAccessToken(accessToken, booking.accessTokenHash)) {
    throw new BookingServiceError(
      "We couldn't verify this booking session.",
      "SESSION_NOT_FOUND",
    );
  }
  const attached = await repo.attachUser(reference, userId);
  if (!attached) {
    throw new BookingServiceError(
      "This booking is already linked to another account.",
      "INVALID_BOOKING",
    );
  }
  return toTripView(attached, kind);
}

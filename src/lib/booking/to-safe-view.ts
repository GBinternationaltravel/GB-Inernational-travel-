import type { StoredBooking } from "@/lib/booking/repository";
import { maskEmail, maskPassport, maskPhone } from "@/lib/booking/masking";
import { getFlightSupplierEnv } from "@/config/flight-supplier";
import type { SafeBookingView } from "@/types/booking";

export function toSafeBookingView(
  booking: StoredBooking,
  store: "prisma" | "file",
): SafeBookingView {
  const env = getFlightSupplierEnv();
  const supplierCode =
    booking.supplierCode ?? booking.offerSnapshot.supplierCode ?? null;
  return {
    reference: booking.reference,
    status: booking.status,
    currency: booking.currency,
    subtotalAmount: booking.subtotalAmount,
    taxesAmount: booking.taxesAmount,
    feesAmount: booking.feesAmount,
    totalAmount: booking.totalAmount,
    contactEmailMasked: maskEmail(booking.contactEmail),
    contactPhoneMasked: `${booking.contactPhoneCountry} ${maskPhone(booking.contactPhone)}`,
    termsAccepted: Boolean(booking.termsAcceptedAt),
    expiresAt: booking.expiresAt ?? null,
    createdAt: booking.createdAt,
    store,
    offer: booking.offerSnapshot,
    passengers: booking.passengers.map((passenger) => ({
      id: passenger.id,
      type: passenger.passengerType,
      firstName: passenger.firstName,
      middleName: passenger.middleName,
      lastName: passenger.lastName,
      nationality: passenger.nationality,
      passportMasked: maskPassport(passenger.passportNumber),
    })),
    pricingNotice: booking.offerSnapshot.pricing.notice,
    supplier: {
      supplierCode,
      supplierBookingRef: booking.supplierBookingRef ?? null,
      supplierBookingStatus: booking.supplierBookingStatus ?? null,
      supplierTicketingStatus: booking.supplierTicketingStatus ?? null,
      priceStatus: booking.offerSnapshot.isMock ? "Mock" : "Verified",
      environment:
        supplierCode === "TRAVELPORT"
          ? env.travelport.environment === "sandbox"
            ? "Pre-production"
            : "Production"
          : supplierCode === "MOCK"
            ? "Development"
            : null,
    },
  };
}

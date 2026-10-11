import { BOOKING_DRAFT_EXPIRY_MINUTES } from "@/config/booking";
import { bookingDraftSchema, bookingTermsSchema } from "@/lib/validations/booking";
import type { BookingDraftInput } from "@/lib/validations/booking";
import { getFlightOfferById, revalidateFlightOffer, createSupplierBooking } from "@/services/flight-service";
import { buildIdempotencyKey } from "@/providers/flights/idempotency";
import { parseTravelportSession } from "@/providers/flights/travelport-booking";
import { buildOfferSnapshot } from "@/lib/booking/pricing";
import {
  generateAccessToken,
  generateBookingReference,
  hashAccessToken,
  verifyAccessToken,
} from "@/lib/booking/reference";
import { getBookingRepository } from "@/lib/booking/get-repository";
import type { StoredBooking } from "@/lib/booking/repository";
import { redactForLogs } from "@/lib/booking/masking";
import { writeAuditLog } from "@/lib/security/audit";
import type { SafeBookingView } from "@/types/booking";
import { toSafeBookingView } from "@/lib/booking/to-safe-view";
import type { FlightOffer } from "@/types/flight";

export type { SafeBookingView } from "@/types/booking";

export class BookingServiceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "VALIDATION"
      | "OFFER_NOT_FOUND"
      | "SESSION_NOT_FOUND"
      | "EXPIRED"
      | "INVALID_BOOKING"
      | "DATABASE"
      | "PROVIDER",
  ) {
    super(message);
    this.name = "BookingServiceError";
  }
}

function isExpired(booking: StoredBooking): boolean {
  if (!booking.expiresAt) return false;
  return new Date(booking.expiresAt).getTime() < Date.now();
}

function toSafeView(
  booking: StoredBooking,
  store: "prisma" | "file",
): SafeBookingView {
  return toSafeBookingView(booking, store);
}

async function revalidateStoredOffers(current: StoredBooking) {
  const snap = current.offerSnapshot;
  const outbound = await revalidateFlightOffer({
    internalOfferId: snap.internalOfferId || current.selectedOfferId,
    supplierOfferId: current.supplierOfferId || snap.supplierOfferId,
    supplierCode: current.supplierCode || snap.supplierCode,
    supplierSessionRef: current.supplierSessionRef ?? snap.supplierSessionRef,
    expectedTotal:
      snap.outboundSupplierFare ??
      snap.pricing.supplierFare - (snap.returnSupplierFare ?? 0),
    currency: current.currency,
    departureDate: snap.departureAt.slice(0, 10),
  });

  if (outbound.status === "EXPIRED" || outbound.status === "NO_AVAILABILITY") {
    return { status: outbound.status, snapshot: null as ReturnType<typeof buildOfferSnapshot> | null };
  }

  if (!snap.returnLeg) {
    if (!outbound.offer) {
      return { status: "FAILED" as const, snapshot: null };
    }
    return {
      status: outbound.status === "PRICE_CHANGED" ? ("PRICE_CHANGED" as const) : outbound.status,
      snapshot: buildOfferSnapshot(outbound.offer),
    };
  }

  const inbound = await revalidateFlightOffer({
    internalOfferId: snap.returnLeg.internalOfferId,
    supplierOfferId: snap.returnLeg.supplierOfferId,
    supplierCode: snap.returnLeg.supplierCode,
    supplierSessionRef: snap.returnLeg.supplierSessionRef,
    expectedTotal: snap.returnSupplierFare,
    currency: current.currency,
    departureDate: snap.returnLeg.departureAt.slice(0, 10),
  });

  if (inbound.status === "EXPIRED" || inbound.status === "NO_AVAILABILITY") {
    return { status: inbound.status, snapshot: null };
  }
  if (!outbound.offer || !inbound.offer) {
    return { status: "FAILED" as const, snapshot: null };
  }

  const changed = outbound.status === "PRICE_CHANGED" || inbound.status === "PRICE_CHANGED";
  return {
    status: changed ? ("PRICE_CHANGED" as const) : ("VALID" as const),
    snapshot: buildOfferSnapshot(outbound.offer, inbound.offer),
  };
}

export async function createOrUpdateBookingDraft(
  rawInput: unknown,
  existing?: { reference: string; accessToken: string },
  userId?: string | null,
): Promise<{ booking: SafeBookingView; accessToken: string; reference: string }> {
  const parsed = bookingDraftSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new BookingServiceError(
      parsed.error.issues[0]?.message ?? "Please check the passenger details.",
      "VALIDATION",
    );
  }

  const input: BookingDraftInput = parsed.data;
  const offer = await getFlightOfferById(input.offerId, {
    departureDate: input.departureDate,
    origin: input.origin,
    destination: input.destination,
  });
  if (!offer) {
    throw new BookingServiceError(
      "Your selected flight is no longer available in this browser session.",
      "OFFER_NOT_FOUND",
    );
  }

  // Ensure route context still matches the selected offer.
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];
  if (
    !first ||
    !last ||
    first.origin.iataCode !== input.origin.toUpperCase() ||
    last.destination.iataCode !== input.destination.toUpperCase()
  ) {
    throw new BookingServiceError(
      "Your selected flight does not match this search.",
      "OFFER_NOT_FOUND",
    );
  }

  let returnOffer: FlightOffer | undefined;
  if (input.tripType === "ROUND_TRIP") {
    if (!input.returnOfferId || !input.returnDate) {
      throw new BookingServiceError(
        "Please select a return flight.",
        "VALIDATION",
      );
    }
    returnOffer =
      (await getFlightOfferById(input.returnOfferId, {
        departureDate: input.returnDate,
        origin: input.destination,
        destination: input.origin,
      })) ?? undefined;
    if (!returnOffer) {
      throw new BookingServiceError(
        "Your selected return flight is no longer available in this browser session.",
        "OFFER_NOT_FOUND",
      );
    }
    const returnFirst = returnOffer.segments[0];
    const returnLast = returnOffer.segments[returnOffer.segments.length - 1];
    if (
      !returnFirst ||
      !returnLast ||
      returnFirst.origin.iataCode !== input.destination.toUpperCase() ||
      returnLast.destination.iataCode !== input.origin.toUpperCase()
    ) {
      throw new BookingServiceError(
        "Your selected return flight does not match this search.",
        "OFFER_NOT_FOUND",
      );
    }
  }

  let snapshot;
  try {
    snapshot = buildOfferSnapshot(offer, returnOffer);
  } catch {
    throw new BookingServiceError(
      "We couldn't prepare this flight for booking. Please select another flight.",
      "PROVIDER",
    );
  }

  const { repo, kind } = await getBookingRepository();
  const accessToken = generateAccessToken();
  const accessTokenHash = hashAccessToken(accessToken);
  const expiresAt = new Date(Date.now() + BOOKING_DRAFT_EXPIRY_MINUTES * 60_000);

  const recordInput = {
    reference: existing?.reference ?? generateBookingReference(),
    accessTokenHash,
    userId: userId ?? null,
    tripType: input.tripType,
    currency: snapshot.pricing.currency,
    subtotalAmount: snapshot.pricing.baseFare,
    taxesAmount: snapshot.pricing.taxes,
    feesAmount: snapshot.pricing.fees,
    totalAmount: snapshot.pricing.total,
    contactEmail: input.contact.email.toLowerCase(),
    contactPhone: input.contact.phone,
    contactPhoneCountry: input.contact.phoneCountryCode,
    selectedOfferId: offer.id,
    offerSnapshot: snapshot,
    providerCode: offer.providerCode,
    supplierCode: offer.supplierCode || offer.providerCode,
    supplierOfferId: offer.supplierOfferId || offer.id,
    supplierSessionRef: offer.supplierSessionRef ?? null,
    offerExpiresAt: offer.expiresAt ?? null,
    notes: input.specialRequests,
    adults: input.adults,
    children: input.children,
    infants: input.infants,
    cabinClass: input.cabinClass,
    expiresAt,
    passengers: input.passengers,
  };

  try {
    let booking: StoredBooking | null = null;

    if (existing?.reference && existing.accessToken) {
      const current = await repo.findByReference(existing.reference);
      if (
        current &&
        verifyAccessToken(existing.accessToken, current.accessTokenHash) &&
        current.status === "DRAFT" &&
        !isExpired(current)
      ) {
        booking = await repo.updateDraft(
          existing.reference,
          current.accessTokenHash,
          { ...recordInput, reference: existing.reference, accessTokenHash },
        );
      }
    }

    if (!booking) {
      // Unique reference retry
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          booking = await repo.createDraft({
            ...recordInput,
            reference: generateBookingReference(),
            accessTokenHash,
          });
          break;
        } catch {
          if (attempt === 4) throw new Error("REFERENCE_COLLISION");
        }
      }
    }

    if (!booking) {
      throw new BookingServiceError(
        "We couldn't create your booking draft. Please try again.",
        "DATABASE",
      );
    }

    await writeAuditLog({
      action: "BOOKING_DRAFT_UPSERT",
      entityType: "Booking",
      entityId: booking.reference,
      metadata: redactForLogs({
        origin: input.origin,
        destination: input.destination,
        adults: input.adults,
        children: input.children,
        infants: input.infants,
        store: kind,
        userId: userId ?? null,
      }),
      userId: userId ?? undefined,
    });

    return {
      booking: toSafeView(booking, kind),
      accessToken,
      reference: booking.reference,
    };
  } catch (error) {
    if (error instanceof BookingServiceError) throw error;
    throw new BookingServiceError(
      "We couldn't save your booking right now. Please try again.",
      "DATABASE",
    );
  }
}

export async function getBookingForSession(
  reference: string,
  accessToken: string,
): Promise<SafeBookingView> {
  const { repo, kind } = await getBookingRepository();
  const booking = await repo.findByReference(reference);
  if (!booking) {
    throw new BookingServiceError("We couldn't find this booking.", "SESSION_NOT_FOUND");
  }
  if (!verifyAccessToken(accessToken, booking.accessTokenHash)) {
    throw new BookingServiceError("We couldn't verify this booking session.", "SESSION_NOT_FOUND");
  }
  if (isExpired(booking) && booking.status === "DRAFT") {
    throw new BookingServiceError(
      "This booking draft has expired. Please search again.",
      "EXPIRED",
    );
  }
  return toSafeView(booking, kind);
}

export async function acceptBookingTerms(
  reference: string,
  accessToken: string,
): Promise<SafeBookingView> {
  const parsed = bookingTermsSchema.safeParse({ reference, accepted: true });
  if (!parsed.success) {
    throw new BookingServiceError(
      parsed.error.issues[0]?.message ?? "Please accept the booking terms.",
      "VALIDATION",
    );
  }

  const { repo, kind } = await getBookingRepository();
  const current = await repo.findByReference(reference);
  if (!current || !verifyAccessToken(accessToken, current.accessTokenHash)) {
    throw new BookingServiceError("We couldn't verify this booking session.", "SESSION_NOT_FOUND");
  }
  if (isExpired(current) && current.status === "DRAFT") {
    throw new BookingServiceError(
      "This booking draft has expired. Please search again.",
      "EXPIRED",
    );
  }

  const updated = await repo.acceptTerms(reference, current.accessTokenHash);
  if (!updated) {
    throw new BookingServiceError("We couldn't update this booking.", "INVALID_BOOKING");
  }

  await writeAuditLog({
    action: "BOOKING_TERMS_ACCEPTED",
    entityType: "Booking",
    entityId: reference,
    metadata: { store: kind },
  });

  return toSafeView(updated, kind);
}

/**
 * After supplier revalidation reports PRICE_CHANGED, apply the new fare only when
 * the customer explicitly accepts it. Never silently change totals.
 */
export async function applyAcceptedSupplierPrice(
  reference: string,
  accessToken: string,
  input: { previousTotal: number; acceptedTotal: number },
): Promise<SafeBookingView> {
  const { repo, kind } = await getBookingRepository();
  const current = await repo.findByReference(reference);
  if (!current || !verifyAccessToken(accessToken, current.accessTokenHash)) {
    throw new BookingServiceError("We couldn't verify this booking session.", "SESSION_NOT_FOUND");
  }
  if (isExpired(current) && current.status === "DRAFT") {
    throw new BookingServiceError(
      "This booking draft has expired. Please search again.",
      "EXPIRED",
    );
  }

  if (Math.abs(current.totalAmount - input.previousTotal) >= 1) {
    throw new BookingServiceError(
      "The previous price no longer matches this booking. Please review again.",
      "VALIDATION",
    );
  }

  const revalidated = await revalidateStoredOffers(current);

  if (revalidated.status === "EXPIRED" || revalidated.status === "NO_AVAILABILITY") {
    throw new BookingServiceError(
      "Your selected flight is no longer available.",
      "OFFER_NOT_FOUND",
    );
  }

  const snapshot = revalidated.snapshot;
  if (!snapshot) {
    throw new BookingServiceError(
      "We couldn't revalidate this flight price right now.",
      "PROVIDER",
    );
  }

  // Rebuild markup from the new supplier offer once (never reuse previous markup).
  if (Math.abs(snapshot.pricing.total - input.acceptedTotal) >= 1) {
    throw new BookingServiceError(
      "The supplier price changed again. Please review the updated amount.",
      "VALIDATION",
    );
  }

  if (!repo.updatePricing) {
    throw new BookingServiceError(
      "We couldn't update this booking price right now.",
      "DATABASE",
    );
  }

  const updated = await repo.updatePricing(reference, current.accessTokenHash, {
    subtotalAmount: snapshot.pricing.baseFare,
    taxesAmount: snapshot.pricing.taxes,
    feesAmount: snapshot.pricing.fees,
    totalAmount: snapshot.pricing.total,
    currency: snapshot.pricing.currency,
    offerSnapshot: snapshot,
    supplierSessionRef: snapshot.supplierSessionRef ?? current.supplierSessionRef,
    offerExpiresAt: snapshot.expiresAt ?? current.offerExpiresAt,
  });

  if (!updated) {
    throw new BookingServiceError("We couldn't update this booking.", "INVALID_BOOKING");
  }

  await writeAuditLog({
    action: "BOOKING_PRICE_ACCEPTED",
    entityType: "Booking",
    entityId: reference,
    metadata: redactForLogs({
      store: kind,
      previousTotal: input.previousTotal,
      acceptedTotal: input.acceptedTotal,
    }),
  });

  return toSafeView(updated, kind);
}

/**
 * Create Travelport (or other supplier) reservation after revalidation.
 * Does not charge cards and does not issue tickets.
 */
export async function createSupplierReservationForBooking(
  reference: string,
  accessToken: string,
): Promise<{
  booking: SafeBookingView;
  supplierResult: {
    ok: boolean;
    code?: string;
    message: string;
    supplierBookingRef?: string | null;
  };
}> {
  const { repo, kind } = await getBookingRepository();
  const current = await repo.findByReference(reference);
  if (!current || !verifyAccessToken(accessToken, current.accessTokenHash)) {
    throw new BookingServiceError("We couldn't verify this booking session.", "SESSION_NOT_FOUND");
  }
  if (isExpired(current) && current.status === "DRAFT") {
    throw new BookingServiceError(
      "This booking draft has expired. Please search again.",
      "EXPIRED",
    );
  }

  if (current.supplierBookingRef) {
    return {
      booking: toSafeView(current, kind),
      supplierResult: {
        ok: true,
        message: "Supplier booking reference already present.",
        supplierBookingRef: current.supplierBookingRef,
      },
    };
  }

  const revalidated = await revalidateStoredOffers(current);

  if (revalidated.status === "EXPIRED" || revalidated.status === "NO_AVAILABILITY") {
    throw new BookingServiceError(
      "Your selected flight is no longer available.",
      "OFFER_NOT_FOUND",
    );
  }
  if (revalidated.status === "PRICE_CHANGED") {
    throw new BookingServiceError(
      "Your selected flight price has changed. Please accept the updated price before continuing.",
      "VALIDATION",
    );
  }

  const sessionRef =
    revalidated.snapshot?.supplierSessionRef ??
    current.supplierSessionRef ??
    current.offerSnapshot.supplierSessionRef;

  const result = await createSupplierBooking({
    idempotencyKey: buildIdempotencyKey([
      "supplier-book",
      reference,
      current.supplierOfferId || current.offerSnapshot.supplierOfferId,
    ]),
    internalOfferId: current.offerSnapshot.internalOfferId || current.selectedOfferId,
    supplierOfferId: current.supplierOfferId || current.offerSnapshot.supplierOfferId,
    supplierCode: current.supplierCode || current.offerSnapshot.supplierCode,
    supplierSessionRef: sessionRef,
    contactEmail: current.contactEmail,
    contactPhone: current.contactPhone,
    // Supplier fare only — never the customer total (which already includes markup).
    expectedTotal:
      current.offerSnapshot.pricing.supplierFare ??
      current.subtotalAmount + current.taxesAmount,
    currency: current.currency,
    passengers: current.passengers.map((passenger) => ({
      type: passenger.passengerType as "ADULT" | "CHILD" | "INFANT",
      firstName: passenger.firstName,
      middleName: passenger.middleName,
      lastName: passenger.lastName,
      dateOfBirth: passenger.dateOfBirth,
      gender: passenger.gender as "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED",
      nationality: passenger.nationality,
      hasTravelDocument: Boolean(passenger.passportNumber),
      travelDocument: passenger.passportNumber
        ? {
            number: passenger.passportNumber,
            issuingCountry: passenger.passportIssuingCountry,
            expiry: passenger.passportExpiry,
          }
        : null,
    })),
  });

  if (!result.ok) {
    if (result.code === "NOT_CONFIGURED" || result.code === "NOT_SUPPORTED") {
      return {
        booking: toSafeView(current, kind),
        supplierResult: {
          ok: false,
          code: result.code,
          message: result.message,
        },
      };
    }
    throw new BookingServiceError(result.message, "PROVIDER");
  }

  if (!repo.updateSupplierBooking) {
    throw new BookingServiceError(
      "We couldn't store the supplier booking reference.",
      "DATABASE",
    );
  }

  const session = parseTravelportSession(sessionRef);
  const updatedSession = JSON.stringify({
    ...session,
    workbenchId: result.workbenchId ?? result.supplierBookingId,
  });

  const updated = await repo.updateSupplierBooking(reference, current.accessTokenHash, {
    supplierCode: current.supplierCode || current.offerSnapshot.supplierCode,
    supplierOfferId: current.supplierOfferId || current.offerSnapshot.supplierOfferId,
    supplierSessionRef: updatedSession,
    supplierBookingId: result.supplierBookingId,
    supplierBookingRef: result.supplierBookingRef,
    supplierBookingStatus: result.supplierBookingStatus,
    supplierTicketingStatus: result.ticketingStatus,
  });

  if (!updated) {
    throw new BookingServiceError("We couldn't update this booking.", "INVALID_BOOKING");
  }

  await writeAuditLog({
    action: "SUPPLIER_BOOKING_CREATED",
    entityType: "Booking",
    entityId: reference,
    metadata: redactForLogs({
      store: kind,
      supplierCode: updated.supplierCode,
      supplierBookingRef: result.supplierBookingRef,
      supplierBookingStatus: result.supplierBookingStatus,
    }),
  });

  return {
    booking: toSafeView(updated, kind),
    supplierResult: {
      ok: true,
      message: result.message,
      supplierBookingRef: result.supplierBookingRef,
    },
  };
}

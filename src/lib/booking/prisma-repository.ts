import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  BookingRepository,
  CreateStoredBookingInput,
  StoredBooking,
} from "@/lib/booking/repository";
import type { OfferSnapshot } from "@/lib/booking/pricing";

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : Number(value);
}

type BookingWithPassengers = Prisma.BookingGetPayload<{
  include: {
    bookingPassengers: {
      include: { passenger: true };
    };
  };
}>;

function mapBooking(booking: BookingWithPassengers): StoredBooking {
  return {
    id: booking.id,
    userId: booking.userId,
    reference: booking.reference,
    accessTokenHash: booking.accessTokenHash,
    tripType: booking.tripType,
    status: booking.status,
    currency: booking.currency,
    subtotalAmount: toNumber(booking.subtotalAmount),
    taxesAmount: toNumber(booking.taxesAmount),
    feesAmount: toNumber(booking.feesAmount),
    totalAmount: toNumber(booking.totalAmount),
    contactEmail: booking.contactEmail,
    contactPhone: booking.contactPhone ?? "",
    contactPhoneCountry: booking.contactPhoneCountry ?? "",
    selectedOfferId: booking.selectedOfferId ?? "",
    offerSnapshot: (() => {
      const snap = booking.offerSnapshot as OfferSnapshot;
      return {
        ...snap,
        internalOfferId: snap.internalOfferId ?? snap.offerId,
        supplierCode: snap.supplierCode ?? booking.supplierCode ?? booking.providerCode ?? "MOCK",
        supplierOfferId: snap.supplierOfferId ?? booking.supplierOfferId ?? snap.offerId,
        supplierSessionRef: snap.supplierSessionRef ?? booking.supplierSessionRef ?? null,
        expiresAt: snap.expiresAt ?? booking.offerExpiresAt?.toISOString() ?? null,
        isMock: snap.isMock ?? true,
      };
    })(),
    providerCode: booking.providerCode ?? "MOCK",
    supplierCode: booking.supplierCode,
    supplierOfferId: booking.supplierOfferId,
    supplierSessionRef: booking.supplierSessionRef,
    supplierBookingId: booking.providerBookingId,
    supplierBookingRef: booking.supplierBookingRef,
    supplierBookingStatus: booking.supplierBookingStatus,
    supplierTicketingStatus: booking.supplierTicketingStatus,
    offerExpiresAt: booking.offerExpiresAt?.toISOString() ?? null,
    notes: booking.notes ?? undefined,
    adults: booking.adults,
    children: booking.children,
    infants: booking.infants,
    cabinClass: booking.cabinClass,
    termsAcceptedAt: booking.termsAcceptedAt?.toISOString() ?? null,
    expiresAt: booking.expiresAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    passengers: booking.bookingPassengers.map((row) => ({
      id: row.passenger.id,
      passengerType: row.passengerType,
      firstName: row.passenger.firstName,
      middleName: row.passenger.middleName ?? undefined,
      lastName: row.passenger.lastName,
      dateOfBirth: row.passenger.dateOfBirth?.toISOString().slice(0, 10) ?? "",
      gender: row.passenger.gender,
      nationality: row.passenger.nationality ?? "",
      passportNumber: row.passenger.passportNumber ?? "",
      passportIssuingCountry: row.passenger.passportIssuingCountry ?? "",
      passportExpiry: row.passenger.passportExpiry?.toISOString().slice(0, 10) ?? "",
    })),
  };
}

const includePassengers = {
  bookingPassengers: {
    include: { passenger: true },
  },
} satisfies Prisma.BookingInclude;

export class PrismaBookingRepository implements BookingRepository {
  async createDraft(input: CreateStoredBookingInput): Promise<StoredBooking> {
    const booking = await prisma.booking.create({
      data: {
        reference: input.reference,
        accessTokenHash: input.accessTokenHash,
        userId: input.userId ?? undefined,
        tripType: input.tripType,
        status: "DRAFT",
        currency: input.currency,
        subtotalAmount: input.subtotalAmount,
        taxesAmount: input.taxesAmount,
        feesAmount: input.feesAmount,
        totalAmount: input.totalAmount,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        contactPhoneCountry: input.contactPhoneCountry,
        selectedOfferId: input.selectedOfferId,
        offerSnapshot: input.offerSnapshot as unknown as Prisma.InputJsonValue,
        providerCode: input.providerCode,
        supplierCode: input.supplierCode ?? input.offerSnapshot.supplierCode,
        supplierOfferId: input.supplierOfferId ?? input.offerSnapshot.supplierOfferId,
        supplierSessionRef:
          input.supplierSessionRef ?? input.offerSnapshot.supplierSessionRef,
        offerExpiresAt: input.offerExpiresAt
          ? new Date(input.offerExpiresAt)
          : input.offerSnapshot.expiresAt
            ? new Date(input.offerSnapshot.expiresAt)
            : undefined,
        notes: input.notes,
        adults: input.adults,
        children: input.children,
        infants: input.infants,
        cabinClass: input.cabinClass,
        expiresAt: input.expiresAt,
        bookingPassengers: {
          create: input.passengers.map((passenger) => ({
            passengerType: passenger.type,
            passenger: {
              create: {
                firstName: passenger.firstName,
                middleName: passenger.middleName,
                lastName: passenger.lastName,
                dateOfBirth: new Date(`${passenger.dateOfBirth}T12:00:00`),
                gender: passenger.gender,
                nationality: passenger.nationality,
                passportNumber: passenger.passportNumber,
                passportIssuingCountry: passenger.passportIssuingCountry,
                passportExpiry: new Date(`${passenger.passportExpiry}T12:00:00`),
              },
            },
          })),
        },
      },
      include: includePassengers,
    });

    return mapBooking(booking);
  }

  async updateDraft(
    reference: string,
    accessTokenHash: string,
    input: CreateStoredBookingInput,
  ): Promise<StoredBooking | null> {
    const existing = await prisma.booking.findFirst({
      where: { reference, accessTokenHash, status: "DRAFT" },
      include: includePassengers,
    });
    if (!existing) return null;

    await prisma.$transaction(async (tx) => {
      const passengerIds = existing.bookingPassengers.map((row) => row.passengerId);
      await tx.bookingPassenger.deleteMany({ where: { bookingId: existing.id } });
      if (passengerIds.length) {
        await tx.passenger.deleteMany({ where: { id: { in: passengerIds } } });
      }

      await tx.booking.update({
        where: { id: existing.id },
        data: {
          userId: input.userId ?? existing.userId,
          tripType: input.tripType,
          currency: input.currency,
          subtotalAmount: input.subtotalAmount,
          taxesAmount: input.taxesAmount,
          feesAmount: input.feesAmount,
          totalAmount: input.totalAmount,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          contactPhoneCountry: input.contactPhoneCountry,
          selectedOfferId: input.selectedOfferId,
          offerSnapshot: input.offerSnapshot as unknown as Prisma.InputJsonValue,
          providerCode: input.providerCode,
          supplierCode: input.supplierCode ?? input.offerSnapshot.supplierCode,
          supplierOfferId: input.supplierOfferId ?? input.offerSnapshot.supplierOfferId,
          supplierSessionRef:
            input.supplierSessionRef ?? input.offerSnapshot.supplierSessionRef,
          offerExpiresAt: input.offerExpiresAt
            ? new Date(input.offerExpiresAt)
            : input.offerSnapshot.expiresAt
              ? new Date(input.offerSnapshot.expiresAt)
              : null,
          notes: input.notes,
          adults: input.adults,
          children: input.children,
          infants: input.infants,
          cabinClass: input.cabinClass,
          expiresAt: input.expiresAt,
          termsAcceptedAt: null,
          accessTokenHash: input.accessTokenHash,
          bookingPassengers: {
            create: input.passengers.map((passenger) => ({
              passengerType: passenger.type,
              passenger: {
                create: {
                  firstName: passenger.firstName,
                  middleName: passenger.middleName,
                  lastName: passenger.lastName,
                  dateOfBirth: new Date(`${passenger.dateOfBirth}T12:00:00`),
                  gender: passenger.gender,
                  nationality: passenger.nationality,
                  passportNumber: passenger.passportNumber,
                  passportIssuingCountry: passenger.passportIssuingCountry,
                  passportExpiry: new Date(`${passenger.passportExpiry}T12:00:00`),
                },
              },
            })),
          },
        },
      });
    });

    const updated = await prisma.booking.findUnique({
      where: { id: existing.id },
      include: includePassengers,
    });
    return updated ? mapBooking(updated) : null;
  }

  async findByReference(reference: string): Promise<StoredBooking | null> {
    const booking = await prisma.booking.findUnique({
      where: { reference },
      include: includePassengers,
    });
    return booking ? mapBooking(booking) : null;
  }

  async findById(id: string): Promise<StoredBooking | null> {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: includePassengers,
    });
    return booking ? mapBooking(booking) : null;
  }

  async acceptTerms(
    reference: string,
    accessTokenHash: string,
  ): Promise<StoredBooking | null> {
    const existing = await prisma.booking.findFirst({
      where: {
        reference,
        accessTokenHash,
        status: { in: ["DRAFT", "PENDING_PAYMENT"] },
      },
    });
    if (!existing) return null;

    const booking = await prisma.booking.update({
      where: { id: existing.id },
      data: {
        termsAcceptedAt: new Date(),
        status: "PENDING_PAYMENT",
      },
      include: includePassengers,
    });

    return mapBooking(booking);
  }

  async listByUserId(userId: string): Promise<StoredBooking[]> {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: includePassengers,
      orderBy: { createdAt: "desc" },
    });
    return bookings.map(mapBooking);
  }

  async listAll(): Promise<StoredBooking[]> {
    const bookings = await prisma.booking.findMany({
      include: includePassengers,
      orderBy: { createdAt: "desc" },
    });
    return bookings.map(mapBooking);
  }

  async attachUser(reference: string, userId: string): Promise<StoredBooking | null> {
    const existing = await prisma.booking.findUnique({
      where: { reference },
      include: includePassengers,
    });
    if (!existing) return null;
    if (existing.userId && existing.userId !== userId) return null;

    const booking = await prisma.booking.update({
      where: { id: existing.id },
      data: { userId },
      include: includePassengers,
    });
    return mapBooking(booking);
  }

  async updateStatus(
    id: string,
    status: StoredBooking["status"],
  ): Promise<StoredBooking | null> {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: includePassengers,
    });
    return mapBooking(booking);
  }

  async updatePricing(
    reference: string,
    accessTokenHash: string,
    input: {
      subtotalAmount: number;
      taxesAmount: number;
      feesAmount: number;
      totalAmount: number;
      currency: string;
      offerSnapshot: OfferSnapshot;
      supplierSessionRef?: string | null;
      offerExpiresAt?: string | null;
    },
  ): Promise<StoredBooking | null> {
    const existing = await prisma.booking.findFirst({
      where: {
        reference,
        accessTokenHash,
        status: { in: ["DRAFT", "PENDING_PAYMENT"] },
      },
    });
    if (!existing) return null;

    const booking = await prisma.booking.update({
      where: { id: existing.id },
      data: {
        subtotalAmount: input.subtotalAmount,
        taxesAmount: input.taxesAmount,
        feesAmount: input.feesAmount,
        totalAmount: input.totalAmount,
        currency: input.currency,
        offerSnapshot: input.offerSnapshot as object,
        supplierSessionRef: input.supplierSessionRef ?? existing.supplierSessionRef,
        offerExpiresAt: input.offerExpiresAt
          ? new Date(input.offerExpiresAt)
          : existing.offerExpiresAt,
      },
      include: includePassengers,
    });
    return mapBooking(booking);
  }

  async updateSupplierBooking(
    reference: string,
    accessTokenHash: string,
    input: {
      supplierCode?: string | null;
      supplierOfferId?: string | null;
      supplierSessionRef?: string | null;
      supplierBookingId?: string | null;
      supplierBookingRef?: string | null;
      supplierBookingStatus?: string | null;
      supplierTicketingStatus?: string | null;
    },
  ): Promise<StoredBooking | null> {
    const existing = await prisma.booking.findFirst({
      where: {
        reference,
        accessTokenHash,
        status: { in: ["DRAFT", "PENDING_PAYMENT"] },
      },
    });
    if (!existing) return null;

    const booking = await prisma.booking.update({
      where: { id: existing.id },
      data: {
        supplierCode: input.supplierCode ?? existing.supplierCode,
        supplierOfferId: input.supplierOfferId ?? existing.supplierOfferId,
        supplierSessionRef:
          input.supplierSessionRef ?? existing.supplierSessionRef,
        providerBookingId: input.supplierBookingId ?? existing.providerBookingId,
        supplierBookingRef:
          input.supplierBookingRef ?? existing.supplierBookingRef,
        supplierBookingStatus:
          input.supplierBookingStatus ?? existing.supplierBookingStatus,
        supplierTicketingStatus:
          input.supplierTicketingStatus ?? existing.supplierTicketingStatus,
      },
      include: includePassengers,
    });
    return mapBooking(booking);
  }
}

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type {
  BookingRepository,
  CreateStoredBookingInput,
  StoredBooking,
} from "@/lib/booking/repository";
import type { OfferSnapshot } from "@/lib/booking/pricing";

/**
 * Development fallback when PostgreSQL is unavailable.
 * Persists drafts under `.data/bookings.json` so local UX still works.
 * Production should use PrismaBookingRepository only.
 */
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "bookings.json");

async function readAll(): Promise<StoredBooking[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as StoredBooking[];
  } catch {
    return [];
  }
}

async function writeAll(bookings: StoredBooking[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(bookings, null, 2), "utf8");
}

function buildStored(
  input: CreateStoredBookingInput,
  existing?: StoredBooking,
): StoredBooking {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? randomUUID(),
    userId: input.userId ?? existing?.userId ?? null,
    reference: existing?.reference ?? input.reference,
    accessTokenHash: input.accessTokenHash,
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
    offerSnapshot: input.offerSnapshot,
    providerCode: input.providerCode,
    supplierCode: input.supplierCode ?? input.offerSnapshot.supplierCode ?? null,
    supplierOfferId: input.supplierOfferId ?? input.offerSnapshot.supplierOfferId ?? null,
    supplierSessionRef:
      input.supplierSessionRef ?? input.offerSnapshot.supplierSessionRef ?? null,
    supplierBookingId: input.supplierBookingId ?? null,
    supplierBookingRef: input.supplierBookingRef ?? null,
    supplierBookingStatus: input.supplierBookingStatus ?? null,
    supplierTicketingStatus: input.supplierTicketingStatus ?? null,
    offerExpiresAt: input.offerExpiresAt ?? input.offerSnapshot.expiresAt ?? null,
    notes: input.notes,
    adults: input.adults,
    children: input.children,
    infants: input.infants,
    cabinClass: input.cabinClass,
    termsAcceptedAt: null,
    expiresAt: input.expiresAt.toISOString(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    passengers: input.passengers.map((passenger) => ({
      id: randomUUID(),
      passengerType: passenger.type,
      firstName: passenger.firstName,
      middleName: passenger.middleName,
      lastName: passenger.lastName,
      dateOfBirth: passenger.dateOfBirth,
      gender: passenger.gender,
      nationality: passenger.nationality,
      passportNumber: passenger.passportNumber,
      passportIssuingCountry: passenger.passportIssuingCountry,
      passportExpiry: passenger.passportExpiry,
    })),
  };
}

export class FileBookingRepository implements BookingRepository {
  async createDraft(input: CreateStoredBookingInput): Promise<StoredBooking> {
    const bookings = await readAll();
    const created = buildStored(input);
    bookings.push(created);
    await writeAll(bookings);
    return created;
  }

  async updateDraft(
    reference: string,
    accessTokenHash: string,
    input: CreateStoredBookingInput,
  ): Promise<StoredBooking | null> {
    const bookings = await readAll();
    const index = bookings.findIndex(
      (booking) =>
        booking.reference === reference &&
        booking.accessTokenHash === accessTokenHash &&
        booking.status === "DRAFT",
    );
    if (index < 0) return null;
    const updated = buildStored(input, bookings[index]);
    bookings[index] = updated;
    await writeAll(bookings);
    return updated;
  }

  async findByReference(reference: string): Promise<StoredBooking | null> {
    const bookings = await readAll();
    return bookings.find((booking) => booking.reference === reference) ?? null;
  }

  async findById(id: string): Promise<StoredBooking | null> {
    const bookings = await readAll();
    return bookings.find((booking) => booking.id === id) ?? null;
  }

  async acceptTerms(
    reference: string,
    accessTokenHash: string,
  ): Promise<StoredBooking | null> {
    const bookings = await readAll();
    const index = bookings.findIndex(
      (booking) =>
        booking.reference === reference &&
        booking.accessTokenHash === accessTokenHash &&
        (booking.status === "DRAFT" || booking.status === "PENDING_PAYMENT"),
    );
    if (index < 0) return null;
    const current = bookings[index]!;
    const updated: StoredBooking = {
      ...current,
      termsAcceptedAt: new Date().toISOString(),
      status: "PENDING_PAYMENT",
      updatedAt: new Date().toISOString(),
    };
    bookings[index] = updated;
    await writeAll(bookings);
    return updated;
  }

  async listByUserId(userId: string): Promise<StoredBooking[]> {
    const bookings = await readAll();
    return bookings
      .filter((booking) => booking.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listAll(): Promise<StoredBooking[]> {
    const bookings = await readAll();
    return bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async attachUser(reference: string, userId: string): Promise<StoredBooking | null> {
    const bookings = await readAll();
    const index = bookings.findIndex((booking) => booking.reference === reference);
    if (index < 0) return null;
    const current = bookings[index]!;
    if (current.userId && current.userId !== userId) return null;
    const updated: StoredBooking = {
      ...current,
      userId,
      updatedAt: new Date().toISOString(),
    };
    bookings[index] = updated;
    await writeAll(bookings);
    return updated;
  }

  async updateStatus(
    id: string,
    status: StoredBooking["status"],
  ): Promise<StoredBooking | null> {
    const bookings = await readAll();
    const index = bookings.findIndex((booking) => booking.id === id);
    if (index < 0) return null;
    const updated: StoredBooking = {
      ...bookings[index]!,
      status,
      updatedAt: new Date().toISOString(),
    };
    bookings[index] = updated;
    await writeAll(bookings);
    return updated;
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
    const bookings = await readAll();
    const index = bookings.findIndex(
      (booking) =>
        booking.reference === reference &&
        booking.accessTokenHash === accessTokenHash &&
        (booking.status === "DRAFT" || booking.status === "PENDING_PAYMENT"),
    );
    if (index < 0) return null;
    const current = bookings[index]!;
    const updated: StoredBooking = {
      ...current,
      subtotalAmount: input.subtotalAmount,
      taxesAmount: input.taxesAmount,
      feesAmount: input.feesAmount,
      totalAmount: input.totalAmount,
      currency: input.currency,
      offerSnapshot: input.offerSnapshot,
      supplierSessionRef: input.supplierSessionRef ?? current.supplierSessionRef,
      offerExpiresAt: input.offerExpiresAt ?? current.offerExpiresAt,
      updatedAt: new Date().toISOString(),
    };
    bookings[index] = updated;
    await writeAll(bookings);
    return updated;
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
    const bookings = await readAll();
    const index = bookings.findIndex(
      (booking) =>
        booking.reference === reference &&
        booking.accessTokenHash === accessTokenHash &&
        (booking.status === "DRAFT" || booking.status === "PENDING_PAYMENT"),
    );
    if (index < 0) return null;
    const current = bookings[index]!;
    const updated: StoredBooking = {
      ...current,
      supplierCode: input.supplierCode ?? current.supplierCode,
      supplierOfferId: input.supplierOfferId ?? current.supplierOfferId,
      supplierSessionRef: input.supplierSessionRef ?? current.supplierSessionRef,
      supplierBookingId: input.supplierBookingId ?? current.supplierBookingId,
      supplierBookingRef: input.supplierBookingRef ?? current.supplierBookingRef,
      supplierBookingStatus:
        input.supplierBookingStatus ?? current.supplierBookingStatus,
      supplierTicketingStatus:
        input.supplierTicketingStatus ?? current.supplierTicketingStatus,
      updatedAt: new Date().toISOString(),
    };
    bookings[index] = updated;
    await writeAll(bookings);
    return updated;
  }
}

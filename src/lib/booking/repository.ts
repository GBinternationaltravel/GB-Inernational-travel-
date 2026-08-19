import type { BookingStatus, CabinClass, PassengerType, TripType } from "@prisma/client";
import type { OfferSnapshot } from "@/lib/booking/pricing";
import type { PassengerInput } from "@/lib/validations/booking";

export type StoredPassenger = PassengerInput & {
  id: string;
};

export type StoredBooking = {
  id: string;
  userId?: string | null;
  reference: string;
  accessTokenHash: string;
  tripType: TripType;
  status: BookingStatus;
  currency: string;
  subtotalAmount: number;
  taxesAmount: number;
  feesAmount: number;
  totalAmount: number;
  contactEmail: string;
  contactPhone: string;
  contactPhoneCountry: string;
  selectedOfferId: string;
  offerSnapshot: OfferSnapshot;
  providerCode: string;
  supplierCode?: string | null;
  supplierOfferId?: string | null;
  supplierSessionRef?: string | null;
  supplierBookingId?: string | null;
  supplierBookingRef?: string | null;
  supplierBookingStatus?: string | null;
  supplierTicketingStatus?: string | null;
  offerExpiresAt?: string | null;
  notes?: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
  termsAcceptedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  passengers: Array<{
    id: string;
    passengerType: PassengerType;
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    passportNumber: string;
    passportIssuingCountry: string;
    passportExpiry: string;
  }>;
};

export type CreateStoredBookingInput = {
  reference: string;
  accessTokenHash: string;
  userId?: string | null;
  tripType: TripType;
  currency: string;
  subtotalAmount: number;
  taxesAmount: number;
  feesAmount: number;
  totalAmount: number;
  contactEmail: string;
  contactPhone: string;
  contactPhoneCountry: string;
  selectedOfferId: string;
  offerSnapshot: OfferSnapshot;
  providerCode: string;
  supplierCode?: string | null;
  supplierOfferId?: string | null;
  supplierSessionRef?: string | null;
  supplierBookingId?: string | null;
  supplierBookingRef?: string | null;
  supplierBookingStatus?: string | null;
  supplierTicketingStatus?: string | null;
  offerExpiresAt?: string | null;
  notes?: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
  expiresAt: Date;
  passengers: PassengerInput[];
};

export interface BookingRepository {
  createDraft(input: CreateStoredBookingInput): Promise<StoredBooking>;
  updateDraft(
    reference: string,
    accessTokenHash: string,
    input: CreateStoredBookingInput,
  ): Promise<StoredBooking | null>;
  findByReference(reference: string): Promise<StoredBooking | null>;
  findById(id: string): Promise<StoredBooking | null>;
  acceptTerms(reference: string, accessTokenHash: string): Promise<StoredBooking | null>;
  listByUserId(userId: string): Promise<StoredBooking[]>;
  listAll(): Promise<StoredBooking[]>;
  attachUser(reference: string, userId: string): Promise<StoredBooking | null>;
  updateStatus(id: string, status: BookingStatus): Promise<StoredBooking | null>;
  updatePricing?(
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
  ): Promise<StoredBooking | null>;
  updateSupplierBooking?(
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
  ): Promise<StoredBooking | null>;
}

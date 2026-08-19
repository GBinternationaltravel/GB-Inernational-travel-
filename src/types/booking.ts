import type { OfferSnapshot } from "@/lib/booking/pricing";

export type SafeBookingView = {
  reference: string;
  status: string;
  currency: string;
  subtotalAmount: number;
  taxesAmount: number;
  feesAmount: number;
  totalAmount: number;
  contactEmailMasked: string;
  contactPhoneMasked: string;
  termsAccepted: boolean;
  expiresAt: string | null;
  createdAt?: string;
  store: "prisma" | "file";
  offer: OfferSnapshot;
  passengers: Array<{
    id: string;
    type: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    nationality: string;
    passportMasked: string;
  }>;
  pricingNotice: string;
  supplier: {
    supplierCode: string | null;
    supplierBookingRef: string | null;
    supplierBookingStatus: string | null;
    supplierTicketingStatus: string | null;
    priceStatus: "Verified" | "Pending verification" | "Mock";
    environment: string | null;
  };
};

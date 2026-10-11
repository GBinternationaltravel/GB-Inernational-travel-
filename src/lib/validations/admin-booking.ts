import { z } from "zod";
import {
  bookingDraftSchemaForItinerary,
  passengerBaseSchema,
  passengerContactSchema,
} from "@/lib/validations/booking";
import { cabinClassSchema } from "@/lib/validations/flight";
import type { FlightOffer } from "@/types/flight";

export const ADMIN_BOOKING_CHANNELS = ["PHONE", "WHATSAPP"] as const;
export type AdminBookingChannel = (typeof ADMIN_BOOKING_CHANNELS)[number];

export const ADMIN_TRIP_TYPES = ["ONE_WAY", "ROUND_TRIP"] as const;

/** Client keys that must never override server pricing. */
export const FORBIDDEN_ADMIN_PRICE_KEYS = [
  "total",
  "totalAmount",
  "finalAmount",
  "fees",
  "feesAmount",
  "taxes",
  "taxesAmount",
  "subtotal",
  "subtotalAmount",
  "pricing",
  "offerSnapshot",
  "supplierFare",
  "supplierTotal",
  "customerTotal",
  "baseFare",
  "agencyMarkup",
  "markupAmount",
] as const;

export function findForbiddenAdminPriceKeys(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  return FORBIDDEN_ADMIN_PRICE_KEYS.filter((key) => key in payload);
}

const iata = z
  .string()
  .trim()
  .length(3, "Please select a valid airport")
  .transform((value) => value.toUpperCase());

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date");

export const adminInventorySearchSchema = z
  .object({
    tripType: z.enum(ADMIN_TRIP_TYPES),
    origin: iata,
    destination: iata,
    departureDate: isoDate,
    returnDate: isoDate.optional(),
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(8).default(0),
    infants: z.number().int().min(0).max(4).default(0),
    cabinClass: cabinClassSchema.default("ECONOMY"),
  })
  .superRefine((data, ctx) => {
    if (data.origin === data.destination) {
      ctx.addIssue({
        code: "custom",
        message: "Origin and destination must be different",
        path: ["destination"],
      });
    }
    if (data.tripType === "ROUND_TRIP") {
      if (!data.returnDate) {
        ctx.addIssue({
          code: "custom",
          message: "Return date is required for round trips",
          path: ["returnDate"],
        });
      } else if (data.returnDate < data.departureDate) {
        ctx.addIssue({
          code: "custom",
          message: "Return date cannot be before departure",
          path: ["returnDate"],
        });
      }
    }
    if (data.infants > data.adults) {
      ctx.addIssue({
        code: "custom",
        message: "Infants cannot exceed the number of adults",
        path: ["infants"],
      });
    }
  });

export type AdminInventorySearchInput = z.infer<typeof adminInventorySearchSchema>;

export const adminCreateBookingObjectSchema = z.object({
  channel: z.enum(ADMIN_BOOKING_CHANNELS),
  linkExistingCustomer: z.boolean().optional().default(false),
  termsAccepted: z.literal(true, {
    message: "Confirm the booking details and terms with the customer.",
  }),
  offerId: z.string().trim().min(1, "Selected outbound flight is required"),
  returnOfferId: z.string().trim().min(1).optional(),
  tripType: z.enum(ADMIN_TRIP_TYPES, {
    message: "Admin bookings support one-way and round-trip only.",
  }),
  origin: iata,
  destination: iata,
  departureDate: isoDate,
  returnDate: isoDate.optional(),
  cabinClass: cabinClassSchema,
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(8),
  infants: z.number().int().min(0).max(4),
  contact: passengerContactSchema,
  passengers: z.array(passengerBaseSchema).min(1).max(9),
  specialRequests: z
    .string()
    .trim()
    .max(500, "Please keep special requests under 500 characters")
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      return value.replace(/[<>]/g, "");
    }),
});

export const adminCreateBookingSchema = adminCreateBookingObjectSchema.superRefine(
  (data, ctx) => {
    if (data.tripType === "ROUND_TRIP") {
      if (!data.returnDate) {
        ctx.addIssue({
          code: "custom",
          message: "Return date is required for round trips",
          path: ["returnDate"],
        });
      }
      if (!data.returnOfferId) {
        ctx.addIssue({
          code: "custom",
          message: "Please select a return flight",
          path: ["returnOfferId"],
        });
      }
    }
  },
);

export type AdminCreateBookingInput = z.infer<typeof adminCreateBookingSchema>;

export function toBookingDraftPayload(input: AdminCreateBookingInput) {
  return {
    offerId: input.offerId,
    returnOfferId: input.returnOfferId,
    tripType: input.tripType,
    origin: input.origin,
    destination: input.destination,
    departureDate: input.departureDate,
    returnDate: input.returnDate,
    cabinClass: input.cabinClass,
    adults: input.adults,
    children: input.children,
    infants: input.infants,
    contact: input.contact,
    passengers: input.passengers,
    specialRequests: input.specialRequests,
  };
}

export function parseAdminCreateBookingDraft(
  input: AdminCreateBookingInput,
  itinerary: {
    outboundOffer?: FlightOffer | null;
    returnOffer?: FlightOffer | null;
  },
) {
  return bookingDraftSchemaForItinerary(itinerary).safeParse(toBookingDraftPayload(input));
}

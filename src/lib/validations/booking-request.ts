import { z } from "zod";

export const bookingRequestSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name").max(80),
    phone: z
      .string()
      .trim()
      .min(8, "Please enter a phone number")
      .max(20)
      .regex(/^[0-9+\s()-]+$/, "Use digits and a country code"),
    email: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => value || undefined)
      .refine((value) => !value || z.string().email().safeParse(value).success, {
        message: "Enter a valid email or leave it blank",
      }),
    passengerNames: z.string().trim().max(500).optional().default(""),
    origin: z.string().trim().min(3).max(8),
    destination: z.string().trim().min(3).max(8),
    departureDate: z.string().trim().min(8).max(20),
    returnDate: z.string().trim().max(20).optional().default(""),
    airline: z.string().trim().max(80).optional().default(""),
    flightNumber: z.string().trim().max(20).optional().default(""),
    returnFlightNumber: z.string().trim().max(20).optional().default(""),
    priceLabel: z.string().trim().max(40).optional().default(""),
    adults: z.coerce.number().int().min(1).max(9),
    children: z.coerce.number().int().min(0).max(8).default(0),
    infants: z.coerce.number().int().min(0).max(4).default(0),
    companyWebsite: z.string().max(200).optional().default(""),
  })
  .superRefine((data, ctx) => {
    const namedTravellers = data.adults + data.children;
    if (namedTravellers > 1 && data.passengerNames.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["passengerNames"],
        message: "Add the passenger names, one per line",
      });
    }
    if (data.infants > data.adults) {
      ctx.addIssue({
        code: "custom",
        path: ["infants"],
        message: "Infants cannot exceed adults",
      });
    }
  });

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

import { z } from "zod";

export const cabinClassSchema = z.enum([
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
]);

export const tripTypeSchema = z.enum(["ONE_WAY", "ROUND_TRIP", "MULTI_CITY"]);

const iataCodeSchema = z
  .string()
  .trim()
  .min(1, "Please select an airport")
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z]{3}$/.test(value), {
    message: "Please select a valid airport",
  });

const dateSchema = z
  .string()
  .trim()
  .min(1, "Please select a date")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date");

export const flightSearchSchema = z
  .object({
    tripType: tripTypeSchema.default("ROUND_TRIP"),
    origin: iataCodeSchema,
    destination: iataCodeSchema,
    departureDate: dateSchema,
    returnDate: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid return date")
        .optional(),
    ),
    adults: z.coerce.number().int().min(1, "At least 1 adult is required").max(9),
    children: z.coerce.number().int().min(0).max(8).default(0),
    infants: z.coerce.number().int().min(0).max(4).default(0),
    cabinClass: cabinClassSchema.default("ECONOMY"),
    currency: z.enum(["PKR", "USD", "EUR", "GBP", "AED"]).default("PKR"),
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

    const totalPassengers = data.adults + data.children + data.infants;
    if (totalPassengers < 1 || totalPassengers > 9) {
      ctx.addIssue({
        code: "custom",
        message: "Total passengers must be between 1 and 9",
        path: ["adults"],
      });
    }
  });

export type FlightSearchInput = z.infer<typeof flightSearchSchema>;

/** Map Zod issues to friendly field messages for the UI. */
export function getFlightSearchFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof FlightSearchInput | "form", string>> {
  const messages: Partial<Record<keyof FlightSearchInput | "form", string>> = {};

  for (const issue of error.issues) {
    const key = (issue.path[0] as keyof FlightSearchInput | undefined) ?? "form";
    if (!messages[key]) {
      messages[key] = issue.message;
    }
  }

  return messages;
}

export const contactFormSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(2000),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

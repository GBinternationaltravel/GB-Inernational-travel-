import { z } from "zod";
import { passengerAgeRules } from "@/config/booking";

export const passengerTypeSchema = z.enum(["ADULT", "CHILD", "INFANT"]);
export const genderSchema = z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]);

function ageInYears(dateOfBirth: string, onDate = new Date()): number {
  const dob = new Date(`${dateOfBirth}T12:00:00`);
  let age = onDate.getFullYear() - dob.getFullYear();
  const monthDiff = onDate.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && onDate.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime());
}

const nameSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(60, "Please enter a shorter name")
  .regex(/^[A-Za-z][A-Za-z\s'-]*$/, "Use letters only");

export const passengerSchema = z
  .object({
    type: passengerTypeSchema,
    firstName: nameSchema,
    middleName: z
      .string()
      .trim()
      .max(60)
      .regex(/^$|^[A-Za-z][A-Za-z\s'-]*$/, "Use letters only")
      .optional()
      .transform((value) => (value ? value : undefined)),
    lastName: nameSchema,
    dateOfBirth: z
      .string()
      .trim()
      .min(1, "Date of birth is required")
      .refine(isValidIsoDate, "Please enter a valid date of birth"),
    gender: genderSchema.default("UNSPECIFIED"),
    nationality: z
      .string()
      .trim()
      .length(2, "Please select a nationality")
      .transform((value) => value.toUpperCase()),
    passportNumber: z
      .string()
      .trim()
      .min(5, "Please enter a valid passport number")
      .max(20, "Passport number is too long")
      .regex(/^[A-Za-z0-9]+$/, "Passport number contains invalid characters"),
    passportIssuingCountry: z
      .string()
      .trim()
      .length(2, "Please select an issuing country")
      .transform((value) => value.toUpperCase()),
    passportExpiry: z
      .string()
      .trim()
      .min(1, "Passport expiry is required")
      .refine(isValidIsoDate, "Please enter a valid passport expiry date"),
  })
  .superRefine((data, ctx) => {
    const age = ageInYears(data.dateOfBirth);
    const { adultMinYears, childMinYears, childMaxYears, infantMaxYears } =
      passengerAgeRules;

    if (data.type === "ADULT" && age < adultMinYears) {
      ctx.addIssue({
        code: "custom",
        message: `Adults must be at least ${adultMinYears} years old`,
        path: ["dateOfBirth"],
      });
    }

    if (data.type === "CHILD" && (age < childMinYears || age > childMaxYears)) {
      ctx.addIssue({
        code: "custom",
        message: `Children must be between ${childMinYears} and ${childMaxYears} years old`,
        path: ["dateOfBirth"],
      });
    }

    if (data.type === "INFANT" && (age < 0 || age > infantMaxYears)) {
      ctx.addIssue({
        code: "custom",
        message: `Infants must be ${infantMaxYears} year old or younger`,
        path: ["dateOfBirth"],
      });
    }

    if (data.passportExpiry <= data.dateOfBirth) {
      ctx.addIssue({
        code: "custom",
        message: "Passport expiry must be after date of birth",
        path: ["passportExpiry"],
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (data.passportExpiry < today) {
      ctx.addIssue({
        code: "custom",
        message: "Passport appears to be expired",
        path: ["passportExpiry"],
      });
    }
  });

export type PassengerInput = z.infer<typeof passengerSchema>;

export const passengerContactSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(120),
  phoneCountryCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, "Please select a country calling code"),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .refine((value) => /^\d{7,15}$/.test(value), {
      message: "Please enter a valid phone number",
    }),
});

export type PassengerContactInput = z.infer<typeof passengerContactSchema>;

export const bookingPassengerSchema = passengerSchema;

export const bookingDraftSchema = z
  .object({
    offerId: z.string().trim().min(1, "Selected flight is required"),
    tripType: z.enum(["ONE_WAY", "ROUND_TRIP", "MULTI_CITY"]),
    origin: z.string().trim().length(3),
    destination: z.string().trim().length(3),
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    returnDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    cabinClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]),
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(8),
    infants: z.number().int().min(0).max(4),
    contact: passengerContactSchema,
    passengers: z.array(passengerSchema).min(1).max(9),
    specialRequests: z
      .string()
      .trim()
      .max(500, "Please keep special requests under 500 characters")
      .optional()
      .transform((value) => {
        if (!value) return undefined;
        return value.replace(/[<>]/g, "");
      }),
    bookingReference: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.infants > data.adults) {
      ctx.addIssue({
        code: "custom",
        message: "Infants cannot exceed the number of adults",
        path: ["infants"],
      });
    }

    const adults = data.passengers.filter((p) => p.type === "ADULT").length;
    const children = data.passengers.filter((p) => p.type === "CHILD").length;
    const infants = data.passengers.filter((p) => p.type === "INFANT").length;

    if (adults !== data.adults) {
      ctx.addIssue({
        code: "custom",
        message: "Adult passenger details do not match the search",
        path: ["passengers"],
      });
    }
    if (children !== data.children) {
      ctx.addIssue({
        code: "custom",
        message: "Child passenger details do not match the search",
        path: ["passengers"],
      });
    }
    if (infants !== data.infants) {
      ctx.addIssue({
        code: "custom",
        message: "Infant passenger details do not match the search",
        path: ["passengers"],
      });
    }

    if (adults < 1) {
      ctx.addIssue({
        code: "custom",
        message: "At least one adult is required",
        path: ["passengers"],
      });
    }
  });

export type BookingDraftInput = z.infer<typeof bookingDraftSchema>;

export const bookingTermsSchema = z.object({
  reference: z.string().trim().min(1),
  accepted: z.literal(true, {
    message: "Please confirm you have reviewed the booking details",
  }),
});

export function getBookingFieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!messages[key]) {
      // Never echo raw passport values back in messages
      messages[key] = issue.message;
    }
  }
  return messages;
}

import { z } from "zod";
import { passengerAgeRules } from "@/config/booking";
import {
  isDomesticPakistanItinerary,
  resolvePassengerIdentityRules,
  type PassengerIdentityRules,
} from "@/lib/booking/passenger-identity";
import type { FlightOffer } from "@/types/flight";

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

const optionalNameSchema = z
  .string()
  .trim()
  .max(60, "Please enter a shorter name")
  .regex(/^$|^[A-Za-z][A-Za-z\s'-]*$/, "Use letters only")
  .optional()
  .transform((value) => value ?? "");

const optionalPassportNumberSchema = z
  .string()
  .trim()
  .max(20, "Passport number is too long")
  .regex(/^$|^[A-Za-z0-9]+$/, "Passport number contains invalid characters")
  .optional()
  .transform((value) => value ?? "");

const optionalCountrySchema = z
  .string()
  .trim()
  .max(2)
  .optional()
  .transform((value) => (value ? value.toUpperCase() : ""));

const optionalDateSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value ?? "");

type PassengerIdentityFields = {
  lastName: string;
  dateOfBirth: string;
  passportNumber: string;
  passportIssuingCountry: string;
  passportExpiry: string;
};

function addAgeIssues(
  data: { type: z.infer<typeof passengerTypeSchema>; dateOfBirth: string },
  ctx: z.RefinementCtx,
  pathPrefix: Array<string | number> = [],
) {
  if (!isValidIsoDate(data.dateOfBirth)) return;

  const age = ageInYears(data.dateOfBirth);
  const { adultMinYears, childMinYears, childMaxYears, infantMaxYears } =
    passengerAgeRules;

  if (data.type === "ADULT" && age < adultMinYears) {
    ctx.addIssue({
      code: "custom",
      message: `Adults must be at least ${adultMinYears} years old`,
      path: [...pathPrefix, "dateOfBirth"],
    });
  }

  if (data.type === "CHILD" && (age < childMinYears || age > childMaxYears)) {
    ctx.addIssue({
      code: "custom",
      message: `Children must be between ${childMinYears} and ${childMaxYears} years old`,
      path: [...pathPrefix, "dateOfBirth"],
    });
  }

  if (data.type === "INFANT" && (age < 0 || age > infantMaxYears)) {
    ctx.addIssue({
      code: "custom",
      message: `Infants must be ${infantMaxYears} year old or younger`,
      path: [...pathPrefix, "dateOfBirth"],
    });
  }
}

type IdentityIssueCollector = {
  addIssue: (issue: { path: Array<string | number>; message: string }) => void;
};

export function addPassengerIdentityIssues(
  data: PassengerIdentityFields,
  ctx: IdentityIssueCollector,
  rules: PassengerIdentityRules,
  pathPrefix: Array<string | number> = [],
) {
  if (rules.requireLastName) {
    const parsed = nameSchema.safeParse(data.lastName);
    if (!parsed.success) {
      ctx.addIssue({
        message:
          parsed.error.issues[0]?.message ?? rules.lastNameRequiredMessage,
        path: [...pathPrefix, "lastName"],
      });
    }
  } else if (data.lastName) {
    const parsed = optionalNameSchema.safeParse(data.lastName);
    if (!parsed.success) {
      ctx.addIssue({
        message: parsed.error.issues[0]?.message ?? "Use letters only",
        path: [...pathPrefix, "lastName"],
      });
    }
  }

  if (!rules.requirePassport) {
    return;
  }

  if (!data.passportNumber || data.passportNumber.length < 5) {
    ctx.addIssue({
      message: rules.passportRequiredMessage,
      path: [...pathPrefix, "passportNumber"],
    });
  } else if (!/^[A-Za-z0-9]+$/.test(data.passportNumber)) {
    ctx.addIssue({
      message: "Passport number contains invalid characters",
      path: [...pathPrefix, "passportNumber"],
    });
  }

  if (!data.passportIssuingCountry || data.passportIssuingCountry.length !== 2) {
    ctx.addIssue({
      message: "Please select an issuing country",
      path: [...pathPrefix, "passportIssuingCountry"],
    });
  }

  if (!data.passportExpiry || !isValidIsoDate(data.passportExpiry)) {
    ctx.addIssue({
      message: "Passport expiry is required",
      path: [...pathPrefix, "passportExpiry"],
    });
    return;
  }

  if (data.dateOfBirth && data.passportExpiry <= data.dateOfBirth) {
    ctx.addIssue({
      message: "Passport expiry must be after date of birth",
      path: [...pathPrefix, "passportExpiry"],
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (data.passportExpiry < today) {
    ctx.addIssue({
      message: "Passport appears to be expired",
      path: [...pathPrefix, "passportExpiry"],
    });
  }
}

const FULL_IDENTITY_RULES = resolvePassengerIdentityRules({
  itineraryDomesticPakistan: false,
  nationality: "XX",
});

const passengerBaseObject = z.object({
  type: passengerTypeSchema,
  firstName: nameSchema,
  middleName: z
    .string()
    .trim()
    .max(60)
    .regex(/^$|^[A-Za-z][A-Za-z\s'-]*$/, "Use letters only")
    .optional()
    .transform((value) => (value ? value : undefined)),
  lastName: optionalNameSchema,
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
  passportNumber: optionalPassportNumberSchema,
  passportIssuingCountry: optionalCountrySchema,
  passportExpiry: optionalDateSchema,
});

export const passengerBaseSchema = passengerBaseObject.superRefine((data, ctx) => {
  addAgeIssues(data, ctx);
});

/** Standalone passenger record — keeps full international identity requirements. */
export const passengerSchema = passengerBaseObject.superRefine((data, ctx) => {
  addAgeIssues(data, ctx);
  addPassengerIdentityIssues(
    data,
    {
      addIssue(issue) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: issue.path,
        });
      },
    },
    FULL_IDENTITY_RULES,
  );
});

export type PassengerInput = z.infer<typeof passengerBaseObject>;

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

export type BookingDraftItineraryContext = {
  outboundOffer?: FlightOffer | null;
  returnOffer?: FlightOffer | null;
};

const bookingDraftObjectSchema = z.object({
  offerId: z.string().trim().min(1, "Selected flight is required"),
  returnOfferId: z.string().trim().min(1).optional(),
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
  supplierCode: z.string().trim().optional(),
  returnSupplierCode: z.string().trim().optional(),
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
  bookingReference: z.string().trim().optional(),
});

function refineBookingDraft(
  data: z.infer<typeof bookingDraftObjectSchema>,
  ctx: z.RefinementCtx,
  itinerary?: BookingDraftItineraryContext,
) {
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

  const itineraryDomesticPakistan = isDomesticPakistanItinerary({
    origin: data.origin,
    destination: data.destination,
    tripType: data.tripType,
    outboundOffer: itinerary?.outboundOffer,
    returnOffer: itinerary?.returnOffer,
  });

  for (const [index, passenger] of data.passengers.entries()) {
    const rules = resolvePassengerIdentityRules({
      itineraryDomesticPakistan,
      nationality: passenger.nationality,
      supplierCode: data.supplierCode,
      returnSupplierCode: data.returnSupplierCode,
    });
    addPassengerIdentityIssues(
      passenger,
      {
        addIssue(issue) {
          ctx.addIssue({
            code: "custom",
            message: issue.message,
            path: issue.path,
          });
        },
      },
      rules,
      ["passengers", index],
    );
  }
}

export function bookingDraftSchemaForItinerary(
  itinerary?: BookingDraftItineraryContext,
) {
  return bookingDraftObjectSchema.superRefine((data, ctx) => {
    refineBookingDraft(data, ctx, itinerary);
  });
}

export const bookingDraftSchema = bookingDraftSchemaForItinerary();

export type BookingDraftInput = z.infer<typeof bookingDraftSchema>;

export const bookingTermsSchema = z.object({
  reference: z.string().trim().min(1),
  accepted: z.literal(true, {
    message: "Please confirm you have reviewed the booking details",
  }),
});

export function collectPassengerIdentityFieldErrors(
  passenger: PassengerIdentityFields & { nationality: string },
  rules: PassengerIdentityRules,
  index: number,
): Record<string, string> {
  const fields: Record<string, string> = {};
  addPassengerIdentityIssues(
    passenger,
    {
      addIssue(issue) {
        const key = issue.path.join(".") || "form";
        if (!fields[key]) fields[key] = issue.message;
      },
    },
    rules,
    ["passengers", index],
  );
  return fields;
}

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

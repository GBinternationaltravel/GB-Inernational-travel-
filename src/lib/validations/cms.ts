import { z } from "zod";

const optionalUrl = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().trim().url("Must be a valid URL").optional(),
);

const optionalText = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().trim().optional(),
);

const optionalCoord = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}, z.number().nullable().optional());

const optionalCode = (pattern: RegExp, message: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : String(v).trim().toUpperCase()),
    z.string().regex(pattern, message).optional(),
  );

export const airlineUpsertSchema = z.object({
  iataCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2}$/, "IATA code must be 2 characters"),
  icaoCode: optionalCode(/^[A-Z]{3}$/, "ICAO code must be 3 letters"),
  name: z.string().trim().min(2).max(120),
  countryCode: optionalCode(/^[A-Z]{2}$/, "Country code must be ISO alpha-2"),
  logoUrl: optionalUrl,
  isActive: z.boolean().optional().default(true),
});

export const airportUpsertSchema = z.object({
  iataCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "IATA code must be 3 letters"),
  icaoCode: optionalCode(/^[A-Z]{4}$/, "ICAO code must be 4 letters"),
  name: z.string().trim().min(2).max(160),
  cityName: z.string().trim().min(2).max(100),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Country code must be ISO alpha-2"),
  countryName: z.string().trim().min(2).max(100),
  timezone: optionalText,
  latitude: optionalCoord,
  longitude: optionalCoord,
  isActive: z.boolean().optional().default(true),
});

export const dealUpsertSchema = z.object({
  title: z.string().trim().min(3).max(160),
  airlineCode: optionalText,
  airlineName: optionalText,
  originCode: optionalCode(/^[A-Z]{3}$/, "Origin must be a 3-letter IATA code"),
  destinationCode: optionalCode(/^[A-Z]{3}$/, "Destination must be a 3-letter IATA code"),
  price: z.coerce.number().positive(),
  currency: z.string().trim().toUpperCase().length(3).default("PKR"),
  travelStart: optionalText,
  travelEnd: optionalText,
  expiresAt: optionalText,
  description: optionalText,
  imageUrl: optionalUrl,
  isPublished: z.boolean().optional().default(false),
});

export const faqUpsertSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(5000),
  category: optionalText,
  sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
  isPublished: z.boolean().optional().default(false),
});

export const destinationUpsertSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  countryName: z.string().trim().min(2).max(100),
  cityName: z.string().trim().min(2).max(100),
  title: z.string().trim().min(2).max(160),
  slug: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  ),
  airportCode: optionalCode(/^[A-Z]{3}$/, "Airport must be a 3-letter IATA code"),
  summary: optionalText,
  description: optionalText,
  travelInfo: optionalText,
  visaInfo: optionalText,
  weatherInfo: optionalText,
  seoTitle: optionalText,
  seoDescription: optionalText,
  heroImageUrl: optionalUrl,
  isFeatured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(false),
});

export const travelGuideUpsertSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  ),
  destinationId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().cuid().optional(),
  ),
  content: z.string().trim().min(20).max(100_000),
  coverImageUrl: optionalUrl,
  seoTitle: optionalText,
  seoDescription: optionalText,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().default("DRAFT"),
});

export const flightStatusUpdateSchema = z.object({
  status: z.enum([
    "SCHEDULED",
    "BOARDING",
    "DELAYED",
    "DEPARTED",
    "ARRIVED",
    "CANCELLED",
  ]),
});

export const siteSettingsSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  supportEmail: z.string().trim().email(),
  supportPhone: optionalText,
  address: optionalText,
  defaultCurrency: z.string().trim().toUpperCase().length(3).default("PKR"),
  bookingSupportNote: optionalText,
  ticketIssuerMode: z.enum(["MOCK", "SANDBOX", "MANUAL", "LIVE"]).default("MANUAL"),
});

export const travelUpdateTypeEnum = z.enum([
  "FLIGHT",
  "ROAD",
  "WEATHER",
  "TOURISM",
  "ADVISORY",
]);

export const travelUpdatePriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const travelUpdateUpsertSchema = z.object({
  type: travelUpdateTypeEnum,
  title: z.string().trim().min(3).max(200),
  slug: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  ),
  summary: optionalText,
  body: z.string().trim().min(10).max(50_000),
  priority: travelUpdatePriorityEnum.optional().default("NORMAL"),
  region: optionalText,
  isPublished: z.boolean().optional().default(false),
  publishedAt: optionalText,
  expiresAt: optionalText,
});

export const tourDestinationEnum = z.enum([
  "HUNZA",
  "SKARDU",
  "GILGIT",
  "NALTAR",
  "KHUNJERAB",
  "FAIRY_MEADOWS",
  "DEOSAI",
]);

export const tourSeasonEnum = z.enum(["SPRING", "SUMMER", "AUTUMN", "WINTER"]);

export const tourPackageStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const tourPackageUpsertSchema = z.object({
  name: z.string().trim().min(3).max(160),
  slug: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  ),
  destination: tourDestinationEnum,
  season: tourSeasonEnum,
  durationDays: z.coerce.number().int().min(1).max(60),
  price: z.coerce.number().positive(),
  currency: z.string().trim().toUpperCase().length(3).default("PKR"),
  description: optionalText,
  highlights: optionalText,
  itinerary: optionalText,
  hotel: optionalText,
  transport: optionalText,
  meals: optionalText,
  included: optionalText,
  excluded: optionalText,
  images: optionalText,
  availabilityNote: optionalText,
  status: tourPackageStatusEnum.optional().default("DRAFT"),
});

export const tourInquiryCreateSchema = z.object({
  travelerName: z.string().trim().min(2).max(120),
  travelerEmail: z.string().trim().email(),
  travelerPhone: optionalText,
  travelersCount: z.coerce.number().int().min(1).max(50).default(1),
  preferredDates: optionalText,
  message: optionalText,
});

export const visaDestinationKeyEnum = z.enum([
  "UAE_DUBAI",
  "TURKEY",
  "THAILAND",
  "SINGAPORE",
]);

export const visaGuideUpsertSchema = z.object({
  destinationKey: visaDestinationKeyEnum,
  countryName: z.string().trim().min(2).max(100),
  cityName: optionalText,
  slug: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  ),
  visaType: optionalText,
  eligibility: optionalText,
  requiredDocuments: optionalText,
  processingInfo: optionalText,
  duration: optionalText,
  feesNote: optionalText,
  importantNotes: optionalText,
  officialSourceUrl: optionalUrl,
  seoTitle: optionalText,
  seoDescription: optionalText,
  isPublished: z.boolean().optional().default(false),
});

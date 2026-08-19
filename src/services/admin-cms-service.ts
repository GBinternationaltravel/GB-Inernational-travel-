import { Prisma } from "@prisma/client";
import { ADMIN_PAGE_SIZE } from "@/config/admin";
import { prisma } from "@/lib/db";
import { slugify, uniqueSlug } from "@/lib/cms/slug";
import { writeAuditLog } from "@/lib/security/audit";
import { AdminServiceError } from "@/services/admin-booking-service";
import type {
  airlineUpsertSchema,
  airportUpsertSchema,
  dealUpsertSchema,
  destinationUpsertSchema,
  faqUpsertSchema,
  flightStatusUpdateSchema,
  siteSettingsSchema,
  tourPackageUpsertSchema,
  travelGuideUpsertSchema,
  travelUpdateUpsertSchema,
  visaGuideUpsertSchema,
} from "@/lib/validations/cms";
import type { z } from "zod";

type AirlineInput = z.infer<typeof airlineUpsertSchema>;
type AirportInput = z.infer<typeof airportUpsertSchema>;
type DealInput = z.infer<typeof dealUpsertSchema>;
type FaqInput = z.infer<typeof faqUpsertSchema>;
type DestinationInput = z.infer<typeof destinationUpsertSchema>;
type GuideInput = z.infer<typeof travelGuideUpsertSchema>;
type FlightStatusInput = z.infer<typeof flightStatusUpdateSchema>;
type SettingsInput = z.infer<typeof siteSettingsSchema>;
type TravelUpdateInput = z.infer<typeof travelUpdateUpsertSchema>;
type TourPackageInput = z.infer<typeof tourPackageUpsertSchema>;
type VisaGuideInput = z.infer<typeof visaGuideUpsertSchema>;

const SETTINGS_KEY = "company";

async function ensurePrisma() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new AdminServiceError(
      "PostgreSQL is unreachable. Admin CMS requires Prisma.",
      "STORE",
    );
  }
}

async function upsertCountryCity(input: {
  countryCode: string;
  countryName: string;
  cityName: string;
  timezone?: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const country = await prisma.country.upsert({
    where: { code: input.countryCode },
    create: { code: input.countryCode, name: input.countryName },
    update: { name: input.countryName },
  });
  const citySlug = await uniqueSlug(input.cityName, async (slug) => {
    const existing = await prisma.city.findUnique({ where: { slug } });
    return Boolean(existing && existing.countryId !== country.id);
  });
  const existingCity = await prisma.city.findFirst({
    where: {
      countryId: country.id,
      name: { equals: input.cityName, mode: "insensitive" },
    },
  });
  if (existingCity) {
    return prisma.city.update({
      where: { id: existingCity.id },
      data: {
        timezone: input.timezone ?? existingCity.timezone,
        latitude: input.latitude ?? existingCity.latitude,
        longitude: input.longitude ?? existingCity.longitude,
      },
    });
  }
  return prisma.city.create({
    data: {
      countryId: country.id,
      name: input.cityName,
      slug: citySlug,
      timezone: input.timezone,
      latitude: input.latitude ?? undefined,
      longitude: input.longitude ?? undefined,
    },
  });
}

function parseOptionalDate(value?: string) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new AdminServiceError("Invalid date value.", "VALIDATION");
  }
  return d;
}

/* ───────────────────────── Airlines ───────────────────────── */

export async function listAdminAirlines(input: {
  page?: number;
  query?: string;
  active?: "all" | "active" | "inactive";
}) {
  await ensurePrisma();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const q = (input.query ?? "").trim();
  const where: Prisma.AirlineWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { iataCode: { contains: q.toUpperCase(), mode: "insensitive" } },
      { icaoCode: { contains: q.toUpperCase(), mode: "insensitive" } },
    ];
  }
  if (input.active === "active") where.isActive = true;
  if (input.active === "inactive") where.isActive = false;

  const [total, items] = await Promise.all([
    prisma.airline.count({ where }),
    prisma.airline.findMany({
      where,
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function upsertAdminAirline(input: {
  actorId: string;
  id?: string;
  data: AirlineInput;
}) {
  await ensurePrisma();
  const slug = await uniqueSlug(input.data.name, async (candidate) => {
    const existing = await prisma.airline.findUnique({ where: { slug: candidate } });
    return Boolean(existing && existing.id !== input.id);
  });

  try {
    const airline = input.id
      ? await prisma.airline.update({
          where: { id: input.id },
          data: {
            iataCode: input.data.iataCode,
            icaoCode: input.data.icaoCode,
            name: input.data.name,
            countryCode: input.data.countryCode,
            logoUrl: input.data.logoUrl,
            isActive: input.data.isActive ?? true,
            slug,
          },
        })
      : await prisma.airline.create({
          data: {
            iataCode: input.data.iataCode,
            icaoCode: input.data.icaoCode,
            name: input.data.name,
            countryCode: input.data.countryCode,
            logoUrl: input.data.logoUrl,
            isActive: input.data.isActive ?? true,
            slug,
          },
        });

    await writeAuditLog({
      userId: input.actorId,
      action: input.id ? "CMS_AIRLINE_UPDATED" : "CMS_AIRLINE_CREATED",
      entityType: "Airline",
      entityId: airline.id,
      metadata: { iataCode: airline.iataCode, isActive: airline.isActive },
    });
    return airline;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AdminServiceError("Airline IATA or slug already exists.", "VALIDATION");
    }
    throw error;
  }
}

export async function setAdminAirlineActive(input: {
  actorId: string;
  id: string;
  isActive: boolean;
}) {
  await ensurePrisma();
  const airline = await prisma.airline.findUnique({ where: { id: input.id } });
  if (!airline) throw new AdminServiceError("Airline not found.", "NOT_FOUND");
  const updated = await prisma.airline.update({
    where: { id: input.id },
    data: { isActive: input.isActive },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_AIRLINE_STATUS",
    entityType: "Airline",
    entityId: updated.id,
    metadata: { isActive: updated.isActive },
  });
  return updated;
}

/* ───────────────────────── Airports ───────────────────────── */

export async function listAdminAirports(input: {
  page?: number;
  query?: string;
  active?: "all" | "active" | "inactive";
}) {
  await ensurePrisma();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const q = (input.query ?? "").trim();
  const where: Prisma.AirportWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { iataCode: { contains: q.toUpperCase(), mode: "insensitive" } },
      { icaoCode: { contains: q.toUpperCase(), mode: "insensitive" } },
      { city: { name: { contains: q, mode: "insensitive" } } },
      { city: { country: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (input.active === "active") where.isActive = true;
  if (input.active === "inactive") where.isActive = false;

  const [total, items] = await Promise.all([
    prisma.airport.count({ where }),
    prisma.airport.findMany({
      where,
      include: { city: { include: { country: true } } },
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function upsertAdminAirport(input: {
  actorId: string;
  id?: string;
  data: AirportInput;
}) {
  await ensurePrisma();
  const city = await upsertCountryCity({
    countryCode: input.data.countryCode,
    countryName: input.data.countryName,
    cityName: input.data.cityName,
    timezone: input.data.timezone,
    latitude: input.data.latitude,
    longitude: input.data.longitude,
  });
  const slug = await uniqueSlug(
    `${input.data.iataCode}-${input.data.name}`,
    async (candidate) => {
      const existing = await prisma.airport.findUnique({ where: { slug: candidate } });
      return Boolean(existing && existing.id !== input.id);
    },
  );

  try {
    const airport = input.id
      ? await prisma.airport.update({
          where: { id: input.id },
          data: {
            iataCode: input.data.iataCode,
            icaoCode: input.data.icaoCode,
            name: input.data.name,
            cityId: city.id,
            timezone: input.data.timezone,
            latitude: input.data.latitude ?? undefined,
            longitude: input.data.longitude ?? undefined,
            isActive: input.data.isActive ?? true,
            slug,
          },
          include: { city: { include: { country: true } } },
        })
      : await prisma.airport.create({
          data: {
            iataCode: input.data.iataCode,
            icaoCode: input.data.icaoCode,
            name: input.data.name,
            cityId: city.id,
            timezone: input.data.timezone,
            latitude: input.data.latitude ?? undefined,
            longitude: input.data.longitude ?? undefined,
            isActive: input.data.isActive ?? true,
            slug,
          },
          include: { city: { include: { country: true } } },
        });

    await writeAuditLog({
      userId: input.actorId,
      action: input.id ? "CMS_AIRPORT_UPDATED" : "CMS_AIRPORT_CREATED",
      entityType: "Airport",
      entityId: airport.id,
      metadata: { iataCode: airport.iataCode, isActive: airport.isActive },
    });
    return airport;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AdminServiceError("Airport IATA or slug already exists.", "VALIDATION");
    }
    throw error;
  }
}

export async function setAdminAirportActive(input: {
  actorId: string;
  id: string;
  isActive: boolean;
}) {
  await ensurePrisma();
  const airport = await prisma.airport.findUnique({ where: { id: input.id } });
  if (!airport) throw new AdminServiceError("Airport not found.", "NOT_FOUND");
  const updated = await prisma.airport.update({
    where: { id: input.id },
    data: { isActive: input.isActive },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_AIRPORT_STATUS",
    entityType: "Airport",
    entityId: updated.id,
    metadata: { isActive: updated.isActive },
  });
  return updated;
}

/* ───────────────────────── Flights (view / status) ───────────────────────── */

export async function listAdminFlights(input: {
  page?: number;
  query?: string;
  status?: string;
}) {
  await ensurePrisma();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const q = (input.query ?? "").trim();
  const where: Prisma.FlightWhereInput = {};
  if (q) {
    where.OR = [
      { flightNumber: { contains: q, mode: "insensitive" } },
      { airline: { name: { contains: q, mode: "insensitive" } } },
      { airline: { iataCode: { contains: q.toUpperCase(), mode: "insensitive" } } },
      { providerCode: { contains: q, mode: "insensitive" } },
    ];
  }
  if (input.status) where.status = input.status as Prisma.EnumFlightStatusFilter["equals"];

  const [total, items] = await Promise.all([
    prisma.flight.count({ where }),
    prisma.flight.findMany({
      where,
      include: {
        airline: true,
        segments: {
          include: {
            originAirport: true,
            destinationAirport: true,
          },
          orderBy: { segmentOrder: "asc" },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminFlight(id: string) {
  await ensurePrisma();
  const flight = await prisma.flight.findUnique({
    where: { id },
    include: {
      airline: true,
      segments: {
        include: { originAirport: true, destinationAirport: true },
        orderBy: { segmentOrder: "asc" },
      },
      tickets: { select: { id: true, ticketNumber: true, pnr: true }, take: 20 },
    },
  });
  if (!flight) throw new AdminServiceError("Flight not found.", "NOT_FOUND");
  return flight;
}

export async function updateAdminFlightStatus(input: {
  actorId: string;
  id: string;
  data: FlightStatusInput;
}) {
  await ensurePrisma();
  const existing = await prisma.flight.findUnique({ where: { id: input.id } });
  if (!existing) throw new AdminServiceError("Flight not found.", "NOT_FOUND");
  const updated = await prisma.flight.update({
    where: { id: input.id },
    data: { status: input.data.status },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_FLIGHT_STATUS",
    entityType: "Flight",
    entityId: updated.id,
    metadata: { status: updated.status, previous: existing.status },
  });
  return updated;
}

/* ───────────────────────── Deals ───────────────────────── */

export async function listAdminDeals(input: {
  page?: number;
  query?: string;
  published?: "all" | "published" | "draft";
}) {
  await ensurePrisma();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const q = (input.query ?? "").trim();
  const where: Prisma.DealWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { airlineCode: { contains: q.toUpperCase(), mode: "insensitive" } },
      { originCode: { contains: q.toUpperCase(), mode: "insensitive" } },
      { destinationCode: { contains: q.toUpperCase(), mode: "insensitive" } },
    ];
  }
  if (input.published === "published") where.isPublished = true;
  if (input.published === "draft") where.isPublished = false;

  const [total, items] = await Promise.all([
    prisma.deal.count({ where }),
    prisma.deal.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function upsertAdminDeal(input: {
  actorId: string;
  id?: string;
  data: DealInput;
}) {
  await ensurePrisma();
  const slug = await uniqueSlug(input.data.title, async (candidate) => {
    const existing = await prisma.deal.findUnique({ where: { slug: candidate } });
    return Boolean(existing && existing.id !== input.id);
  });
  const data = {
    title: input.data.title,
    slug,
    airlineCode: input.data.airlineCode,
    airlineName: input.data.airlineName,
    originCode: input.data.originCode,
    destinationCode: input.data.destinationCode,
    price: new Prisma.Decimal(input.data.price),
    currency: input.data.currency,
    travelStart: parseOptionalDate(input.data.travelStart),
    travelEnd: parseOptionalDate(input.data.travelEnd),
    expiresAt: parseOptionalDate(input.data.expiresAt),
    description: input.data.description,
    imageUrl: input.data.imageUrl,
    isPublished: input.data.isPublished ?? false,
  };

  const deal = input.id
    ? await prisma.deal.update({ where: { id: input.id }, data })
    : await prisma.deal.create({ data });

  await writeAuditLog({
    userId: input.actorId,
    action: input.id ? "CMS_DEAL_UPDATED" : "CMS_DEAL_CREATED",
    entityType: "Deal",
    entityId: deal.id,
    metadata: { title: deal.title, isPublished: deal.isPublished },
  });
  return deal;
}

export async function setAdminDealPublished(input: {
  actorId: string;
  id: string;
  isPublished: boolean;
}) {
  await ensurePrisma();
  const existing = await prisma.deal.findUnique({ where: { id: input.id } });
  if (!existing) throw new AdminServiceError("Deal not found.", "NOT_FOUND");
  const deal = await prisma.deal.update({
    where: { id: input.id },
    data: { isPublished: input.isPublished },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_DEAL_PUBLISH",
    entityType: "Deal",
    entityId: deal.id,
    metadata: { isPublished: deal.isPublished },
  });
  return deal;
}

/* ───────────────────────── FAQs ───────────────────────── */

export async function listAdminFaqs(input: {
  page?: number;
  query?: string;
  published?: "all" | "published" | "draft";
}) {
  await ensurePrisma();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const q = (input.query ?? "").trim();
  const where: Prisma.FAQWhereInput = {};
  if (q) {
    where.OR = [
      { question: { contains: q, mode: "insensitive" } },
      { answer: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }
  if (input.published === "published") where.isPublished = true;
  if (input.published === "draft") where.isPublished = false;

  const [total, items] = await Promise.all([
    prisma.fAQ.count({ where }),
    prisma.fAQ.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function upsertAdminFaq(input: {
  actorId: string;
  id?: string;
  data: FaqInput;
}) {
  await ensurePrisma();
  const data = {
    question: input.data.question,
    answer: input.data.answer,
    category: input.data.category,
    sortOrder: input.data.sortOrder ?? 0,
    isPublished: input.data.isPublished ?? false,
  };
  const faq = input.id
    ? await prisma.fAQ.update({ where: { id: input.id }, data })
    : await prisma.fAQ.create({ data });
  await writeAuditLog({
    userId: input.actorId,
    action: input.id ? "CMS_FAQ_UPDATED" : "CMS_FAQ_CREATED",
    entityType: "FAQ",
    entityId: faq.id,
    metadata: { category: faq.category, isPublished: faq.isPublished },
  });
  return faq;
}

export async function setAdminFaqPublished(input: {
  actorId: string;
  id: string;
  isPublished: boolean;
}) {
  await ensurePrisma();
  const existing = await prisma.fAQ.findUnique({ where: { id: input.id } });
  if (!existing) throw new AdminServiceError("FAQ not found.", "NOT_FOUND");
  const faq = await prisma.fAQ.update({
    where: { id: input.id },
    data: { isPublished: input.isPublished },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_FAQ_PUBLISH",
    entityType: "FAQ",
    entityId: faq.id,
    metadata: { isPublished: faq.isPublished },
  });
  return faq;
}

/* ───────────────────────── Destinations ───────────────────────── */

export async function listAdminDestinations(input: {
  page?: number;
  query?: string;
  published?: "all" | "published" | "draft";
}) {
  await ensurePrisma();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const q = (input.query ?? "").trim();
  const where: Prisma.DestinationWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { city: { name: { contains: q, mode: "insensitive" } } },
      { city: { country: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (input.published === "published") where.published = true;
  if (input.published === "draft") where.published = false;

  const [total, items] = await Promise.all([
    prisma.destination.count({ where }),
    prisma.destination.findMany({
      where,
      include: { city: { include: { country: true } } },
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function upsertAdminDestination(input: {
  actorId: string;
  id?: string;
  data: DestinationInput;
}) {
  await ensurePrisma();
  const city = await upsertCountryCity({
    countryCode: input.data.countryCode,
    countryName: input.data.countryName,
    cityName: input.data.cityName,
  });
  const slug =
    input.data.slug ||
    (await uniqueSlug(input.data.title || input.data.cityName, async (candidate) => {
      const existing = await prisma.destination.findUnique({ where: { slug: candidate } });
      return Boolean(existing && existing.id !== input.id);
    }));

  try {
    const data = {
      cityId: city.id,
      slug,
      title: input.data.title,
      summary: input.data.summary,
      description: input.data.description,
      travelInfo: input.data.travelInfo,
      visaInfo: input.data.visaInfo,
      weatherInfo: input.data.weatherInfo,
      airportCode: input.data.airportCode,
      seoTitle: input.data.seoTitle,
      seoDescription: input.data.seoDescription,
      heroImageUrl: input.data.heroImageUrl,
      isFeatured: input.data.isFeatured ?? false,
      published: input.data.published ?? false,
    };
    const destination = input.id
      ? await prisma.destination.update({
          where: { id: input.id },
          data,
          include: { city: { include: { country: true } } },
        })
      : await prisma.destination.create({
          data,
          include: { city: { include: { country: true } } },
        });

    await writeAuditLog({
      userId: input.actorId,
      action: input.id ? "CMS_DESTINATION_UPDATED" : "CMS_DESTINATION_CREATED",
      entityType: "Destination",
      entityId: destination.id,
      metadata: { slug: destination.slug, published: destination.published },
    });
    return destination;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AdminServiceError("Destination slug already exists.", "VALIDATION");
    }
    throw error;
  }
}

export async function setAdminDestinationPublished(input: {
  actorId: string;
  id: string;
  published: boolean;
}) {
  await ensurePrisma();
  const existing = await prisma.destination.findUnique({ where: { id: input.id } });
  if (!existing) throw new AdminServiceError("Destination not found.", "NOT_FOUND");
  const destination = await prisma.destination.update({
    where: { id: input.id },
    data: { published: input.published },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_DESTINATION_PUBLISH",
    entityType: "Destination",
    entityId: destination.id,
    metadata: { published: destination.published },
  });
  return destination;
}

/* ───────────────────────── Travel Guides ───────────────────────── */

export async function listAdminTravelGuides(input: {
  page?: number;
  query?: string;
  status?: "all" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
}) {
  await ensurePrisma();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const q = (input.query ?? "").trim();
  const where: Prisma.TravelGuideWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }
  if (input.status && input.status !== "all") where.status = input.status;

  const [total, items] = await Promise.all([
    prisma.travelGuide.count({ where }),
    prisma.travelGuide.findMany({
      where,
      include: { destination: { select: { id: true, title: true, slug: true } } },
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function upsertAdminTravelGuide(input: {
  actorId: string;
  id?: string;
  data: GuideInput;
}) {
  await ensurePrisma();
  if (input.data.destinationId) {
    const dest = await prisma.destination.findUnique({
      where: { id: input.data.destinationId },
    });
    if (!dest) throw new AdminServiceError("Destination not found.", "VALIDATION");
  }
  const slug =
    input.data.slug ||
    (await uniqueSlug(input.data.title, async (candidate) => {
      const existing = await prisma.travelGuide.findUnique({ where: { slug: candidate } });
      return Boolean(existing && existing.id !== input.id);
    }));

  const status = input.data.status ?? "DRAFT";
  const data = {
    title: input.data.title,
    slug,
    destinationId: input.data.destinationId,
    content: input.data.content,
    coverImageUrl: input.data.coverImageUrl,
    seoTitle: input.data.seoTitle,
    seoDescription: input.data.seoDescription,
    status,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
  };

  try {
    const guide = input.id
      ? await prisma.travelGuide.update({
          where: { id: input.id },
          data,
          include: { destination: { select: { id: true, title: true, slug: true } } },
        })
      : await prisma.travelGuide.create({
          data,
          include: { destination: { select: { id: true, title: true, slug: true } } },
        });

    await writeAuditLog({
      userId: input.actorId,
      action: input.id ? "CMS_GUIDE_UPDATED" : "CMS_GUIDE_CREATED",
      entityType: "TravelGuide",
      entityId: guide.id,
      metadata: { slug: guide.slug, status: guide.status },
    });
    return guide;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AdminServiceError("Travel guide slug already exists.", "VALIDATION");
    }
    throw error;
  }
}

export async function setAdminTravelGuideStatus(input: {
  actorId: string;
  id: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}) {
  await ensurePrisma();
  const existing = await prisma.travelGuide.findUnique({ where: { id: input.id } });
  if (!existing) throw new AdminServiceError("Travel guide not found.", "NOT_FOUND");
  const guide = await prisma.travelGuide.update({
    where: { id: input.id },
    data: {
      status: input.status,
      publishedAt: input.status === "PUBLISHED" ? new Date() : existing.publishedAt,
    },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_GUIDE_STATUS",
    entityType: "TravelGuide",
    entityId: guide.id,
    metadata: { status: guide.status },
  });
  return guide;
}

/* ───────────────────────── Settings ───────────────────────── */

const defaultSettings: SettingsInput = {
  companyName: "GB International Travel",
  supportEmail: "support@gbinternationaltravel.local",
  supportPhone: undefined,
  address: undefined,
  defaultCurrency: "PKR",
  bookingSupportNote: "Tickets are issued after payment verification.",
  ticketIssuerMode: "MANUAL",
};

export async function getAdminSettings() {
  await ensurePrisma();
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row || typeof row.value !== "object" || row.value === null) {
    return { ...defaultSettings, source: "defaults" as const };
  }
  return {
    ...defaultSettings,
    ...(row.value as Partial<SettingsInput>),
    source: "database" as const,
  };
}

export async function saveAdminSettings(input: {
  actorId: string;
  data: SettingsInput;
}) {
  await ensurePrisma();
  const value = {
    companyName: input.data.companyName,
    supportEmail: input.data.supportEmail,
    supportPhone: input.data.supportPhone,
    address: input.data.address,
    defaultCurrency: input.data.defaultCurrency,
    bookingSupportNote: input.data.bookingSupportNote,
    ticketIssuerMode: input.data.ticketIssuerMode,
  };
  const row = await prisma.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, label: "Company settings", value },
    update: { value, label: "Company settings" },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_SETTINGS_UPDATED",
    entityType: "SiteSetting",
    entityId: row.id,
    metadata: {
      companyName: value.companyName,
      ticketIssuerMode: value.ticketIssuerMode,
      defaultCurrency: value.defaultCurrency,
    },
  });
  return value;
}

/** Seed airlines from static catalog when DB table is empty (dev convenience). */
export async function seedAirlinesIfEmpty(staticAirlines: Array<{
  iataCode: string;
  name: string;
}>) {
  await ensurePrisma();
  const count = await prisma.airline.count();
  if (count > 0) return { seeded: 0 };
  let seeded = 0;
  for (const item of staticAirlines) {
    const slug = slugify(item.name) || slugify(item.iataCode);
    await prisma.airline.create({
      data: {
        iataCode: item.iataCode.toUpperCase(),
        name: item.name,
        slug: `${slug}-${item.iataCode.toLowerCase()}`,
        isActive: true,
      },
    });
    seeded += 1;
  }
  return { seeded };
}

function parseJsonTextField(value?: string): Prisma.InputJsonValue | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  try {
    return JSON.parse(trimmed) as Prisma.InputJsonValue;
  } catch {
    // Store as string array lines when not valid JSON
    const lines = trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.length > 0 ? lines : trimmed;
  }
}

function jsonToFormText(value: Prisma.JsonValue | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value.join("\n");
  }
  return JSON.stringify(value, null, 2);
}

export { jsonToFormText };

/* ───────────────────────── Travel Updates ───────────────────────── */

export async function listAdminTravelUpdates(input: {
  page?: number;
  query?: string;
  published?: "all" | "published" | "draft";
  type?: string;
}) {
  await ensurePrisma();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const q = (input.query ?? "").trim();
  const where: Prisma.TravelUpdateWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { region: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
    ];
  }
  if (input.published === "published") where.isPublished = true;
  if (input.published === "draft") where.isPublished = false;
  if (
    input.type &&
    ["FLIGHT", "ROAD", "WEATHER", "TOURISM", "ADVISORY"].includes(input.type)
  ) {
    where.type = input.type as Prisma.EnumTravelUpdateTypeFilter;
  }

  const [total, items] = await Promise.all([
    prisma.travelUpdate.count({ where }),
    prisma.travelUpdate.findMany({
      where,
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function upsertAdminTravelUpdate(input: {
  actorId: string;
  id?: string;
  data: TravelUpdateInput;
}) {
  await ensurePrisma();
  const baseSlug = input.data.slug?.trim() || input.data.title;
  const slug = await uniqueSlug(baseSlug, async (candidate) => {
    const existing = await prisma.travelUpdate.findUnique({ where: { slug: candidate } });
    return Boolean(existing && existing.id !== input.id);
  });

  const isPublished = input.data.isPublished ?? false;
  const publishedAt = isPublished
    ? parseOptionalDate(input.data.publishedAt) ?? new Date()
    : null;

  const data = {
    type: input.data.type,
    title: input.data.title,
    slug,
    summary: input.data.summary,
    body: input.data.body,
    priority: input.data.priority ?? "NORMAL",
    region: input.data.region,
    isPublished,
    publishedAt,
    expiresAt: parseOptionalDate(input.data.expiresAt) ?? null,
  };

  const row = input.id
    ? await prisma.travelUpdate.update({ where: { id: input.id }, data })
    : await prisma.travelUpdate.create({ data });

  await writeAuditLog({
    userId: input.actorId,
    action: input.id ? "CMS_TRAVEL_UPDATE_UPDATED" : "CMS_TRAVEL_UPDATE_CREATED",
    entityType: "TravelUpdate",
    entityId: row.id,
    metadata: {
      title: row.title,
      type: row.type,
      priority: row.priority,
      isPublished: row.isPublished,
    },
  });
  return row;
}

export async function setAdminTravelUpdatePublished(input: {
  actorId: string;
  id: string;
  isPublished: boolean;
}) {
  await ensurePrisma();
  const existing = await prisma.travelUpdate.findUnique({ where: { id: input.id } });
  if (!existing) throw new AdminServiceError("Travel update not found.", "NOT_FOUND");
  const row = await prisma.travelUpdate.update({
    where: { id: input.id },
    data: {
      isPublished: input.isPublished,
      publishedAt: input.isPublished ? existing.publishedAt ?? new Date() : null,
    },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_TRAVEL_UPDATE_PUBLISH",
    entityType: "TravelUpdate",
    entityId: row.id,
    metadata: { isPublished: row.isPublished },
  });
  return row;
}

export async function setAdminTravelUpdatePriority(input: {
  actorId: string;
  id: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
}) {
  await ensurePrisma();
  const existing = await prisma.travelUpdate.findUnique({ where: { id: input.id } });
  if (!existing) throw new AdminServiceError("Travel update not found.", "NOT_FOUND");
  const row = await prisma.travelUpdate.update({
    where: { id: input.id },
    data: { priority: input.priority },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_TRAVEL_UPDATE_PRIORITY",
    entityType: "TravelUpdate",
    entityId: row.id,
    metadata: { priority: row.priority },
  });
  return row;
}

export async function expireAdminTravelUpdate(input: {
  actorId: string;
  id: string;
}) {
  await ensurePrisma();
  const existing = await prisma.travelUpdate.findUnique({ where: { id: input.id } });
  if (!existing) throw new AdminServiceError("Travel update not found.", "NOT_FOUND");
  const row = await prisma.travelUpdate.update({
    where: { id: input.id },
    data: {
      expiresAt: new Date(),
      isPublished: false,
    },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_TRAVEL_UPDATE_EXPIRED",
    entityType: "TravelUpdate",
    entityId: row.id,
    metadata: { expiresAt: row.expiresAt?.toISOString() },
  });
  return row;
}

/* ───────────────────────── Tours ───────────────────────── */

export async function listAdminTours(input: {
  page?: number;
  query?: string;
  status?: "all" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
  destination?: string;
}) {
  await ensurePrisma();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const q = (input.query ?? "").trim();
  const where: Prisma.TourPackageWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  if (input.status && input.status !== "all") {
    where.status = input.status;
  }
  if (
    input.destination &&
    [
      "HUNZA",
      "SKARDU",
      "GILGIT",
      "NALTAR",
      "KHUNJERAB",
      "FAIRY_MEADOWS",
      "DEOSAI",
    ].includes(input.destination)
  ) {
    where.destination = input.destination as Prisma.EnumTourDestinationFilter;
  }

  const [total, items] = await Promise.all([
    prisma.tourPackage.count({ where }),
    prisma.tourPackage.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { inquiries: true } } },
    }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function upsertAdminTour(input: {
  actorId: string;
  id?: string;
  data: TourPackageInput;
}) {
  await ensurePrisma();
  const baseSlug = input.data.slug?.trim() || input.data.name;
  const slug = await uniqueSlug(baseSlug, async (candidate) => {
    const existing = await prisma.tourPackage.findUnique({ where: { slug: candidate } });
    return Boolean(existing && existing.id !== input.id);
  });

  const data = {
    name: input.data.name,
    slug,
    destination: input.data.destination,
    season: input.data.season,
    durationDays: input.data.durationDays,
    price: new Prisma.Decimal(input.data.price),
    currency: input.data.currency,
    description: input.data.description,
    highlights: parseJsonTextField(input.data.highlights),
    itinerary: parseJsonTextField(input.data.itinerary),
    hotel: input.data.hotel,
    transport: input.data.transport,
    meals: input.data.meals,
    included: input.data.included,
    excluded: input.data.excluded,
    images: parseJsonTextField(input.data.images),
    availabilityNote: input.data.availabilityNote,
    status: input.data.status ?? "DRAFT",
  };

  const tour = input.id
    ? await prisma.tourPackage.update({ where: { id: input.id }, data })
    : await prisma.tourPackage.create({ data });

  await writeAuditLog({
    userId: input.actorId,
    action: input.id ? "CMS_TOUR_UPDATED" : "CMS_TOUR_CREATED",
    entityType: "TourPackage",
    entityId: tour.id,
    metadata: {
      name: tour.name,
      destination: tour.destination,
      status: tour.status,
    },
  });
  return tour;
}

export async function setAdminTourStatus(input: {
  actorId: string;
  id: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}) {
  await ensurePrisma();
  const existing = await prisma.tourPackage.findUnique({ where: { id: input.id } });
  if (!existing) throw new AdminServiceError("Tour not found.", "NOT_FOUND");
  const tour = await prisma.tourPackage.update({
    where: { id: input.id },
    data: { status: input.status },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_TOUR_STATUS",
    entityType: "TourPackage",
    entityId: tour.id,
    metadata: { status: tour.status },
  });
  return tour;
}

/* ───────────────────────── Visa Guides ───────────────────────── */

export async function listAdminVisaGuides(input: {
  page?: number;
  query?: string;
  published?: "all" | "published" | "draft";
}) {
  await ensurePrisma();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = ADMIN_PAGE_SIZE;
  const q = (input.query ?? "").trim();
  const where: Prisma.VisaGuideWhereInput = {};
  if (q) {
    where.OR = [
      { countryName: { contains: q, mode: "insensitive" } },
      { cityName: { contains: q, mode: "insensitive" } },
      { visaType: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  if (input.published === "published") where.isPublished = true;
  if (input.published === "draft") where.isPublished = false;

  const [total, items] = await Promise.all([
    prisma.visaGuide.count({ where }),
    prisma.visaGuide.findMany({
      where,
      orderBy: [{ countryName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function upsertAdminVisaGuide(input: {
  actorId: string;
  id?: string;
  data: VisaGuideInput;
}) {
  await ensurePrisma();
  const baseSlug =
    input.data.slug?.trim() ||
    `${input.data.countryName}${input.data.cityName ? `-${input.data.cityName}` : ""}-visa`;
  const slug = await uniqueSlug(baseSlug, async (candidate) => {
    const existing = await prisma.visaGuide.findUnique({ where: { slug: candidate } });
    return Boolean(existing && existing.id !== input.id);
  });

  if (input.id) {
    const existing = await prisma.visaGuide.findUnique({ where: { id: input.id } });
    if (!existing) throw new AdminServiceError("Visa guide not found.", "NOT_FOUND");
  } else {
    const clash = await prisma.visaGuide.findUnique({
      where: { destinationKey: input.data.destinationKey },
    });
    if (clash) {
      throw new AdminServiceError(
        "A visa guide for this destination key already exists. Edit the existing entry.",
        "VALIDATION",
      );
    }
  }

  const data = {
    destinationKey: input.data.destinationKey,
    countryName: input.data.countryName,
    cityName: input.data.cityName,
    slug,
    visaType: input.data.visaType,
    eligibility: input.data.eligibility,
    requiredDocuments: input.data.requiredDocuments,
    processingInfo: input.data.processingInfo,
    duration: input.data.duration,
    feesNote: input.data.feesNote,
    importantNotes: input.data.importantNotes,
    officialSourceUrl: input.data.officialSourceUrl,
    seoTitle: input.data.seoTitle,
    seoDescription: input.data.seoDescription,
    isPublished: input.data.isPublished ?? false,
    lastUpdatedAt: new Date(),
  };

  try {
    const guide = input.id
      ? await prisma.visaGuide.update({ where: { id: input.id }, data })
      : await prisma.visaGuide.create({ data });

    await writeAuditLog({
      userId: input.actorId,
      action: input.id ? "CMS_VISA_GUIDE_UPDATED" : "CMS_VISA_GUIDE_CREATED",
      entityType: "VisaGuide",
      entityId: guide.id,
      metadata: {
        destinationKey: guide.destinationKey,
        isPublished: guide.isPublished,
      },
    });
    return guide;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AdminServiceError(
        "Visa guide slug or destination key already exists.",
        "VALIDATION",
      );
    }
    throw error;
  }
}

export async function setAdminVisaGuidePublished(input: {
  actorId: string;
  id: string;
  isPublished: boolean;
}) {
  await ensurePrisma();
  const existing = await prisma.visaGuide.findUnique({ where: { id: input.id } });
  if (!existing) throw new AdminServiceError("Visa guide not found.", "NOT_FOUND");
  const guide = await prisma.visaGuide.update({
    where: { id: input.id },
    data: { isPublished: input.isPublished, lastUpdatedAt: new Date() },
  });
  await writeAuditLog({
    userId: input.actorId,
    action: "CMS_VISA_GUIDE_PUBLISH",
    entityType: "VisaGuide",
    entityId: guide.id,
    metadata: { isPublished: guide.isPublished },
  });
  return guide;
}

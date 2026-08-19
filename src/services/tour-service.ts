import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/security/audit";
import type { tourInquiryCreateSchema } from "@/lib/validations/cms";
import type { z } from "zod";

type InquiryInput = z.infer<typeof tourInquiryCreateSchema>;

export class TourServiceError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "VALIDATION" | "STORE" = "VALIDATION",
  ) {
    super(message);
    this.name = "TourServiceError";
  }
}

async function ensurePrisma() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new TourServiceError(
      "PostgreSQL is unreachable. Tour inquiries require Prisma.",
      "STORE",
    );
  }
}

function makeInquiryReference() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TQ-${stamp}-${rand}`;
}

export async function listPublishedTours(input?: { destination?: string }) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return [];
  }

  const where: Prisma.TourPackageWhereInput = { status: "PUBLISHED" };
  if (
    input?.destination &&
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

  return prisma.tourPackage.findMany({
    where,
    orderBy: [{ destination: "asc" }, { name: "asc" }],
  });
}

export async function getPublishedTourBySlug(slug: string) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return null;
  }
  return prisma.tourPackage.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
}

export async function createTourInquiry(input: {
  tourSlug: string;
  data: InquiryInput;
}) {
  await ensurePrisma();
  const tour = await prisma.tourPackage.findFirst({
    where: { slug: input.tourSlug, status: "PUBLISHED" },
  });
  if (!tour) {
    throw new TourServiceError("Tour package not found.", "NOT_FOUND");
  }

  let reference = makeInquiryReference();
  for (let i = 0; i < 5; i += 1) {
    const clash = await prisma.tourInquiry.findUnique({ where: { reference } });
    if (!clash) break;
    reference = makeInquiryReference();
  }

  const inquiry = await prisma.tourInquiry.create({
    data: {
      tourId: tour.id,
      reference,
      status: "PENDING",
      travelerName: input.data.travelerName,
      travelerEmail: input.data.travelerEmail,
      travelerPhone: input.data.travelerPhone,
      travelersCount: input.data.travelersCount ?? 1,
      preferredDates: input.data.preferredDates,
      message: input.data.message,
    },
    include: { tour: true },
  });

  await writeAuditLog({
    action: "TOUR_INQUIRY_CREATED",
    entityType: "TourInquiry",
    entityId: inquiry.id,
    metadata: {
      reference: inquiry.reference,
      tourSlug: tour.slug,
      travelersCount: inquiry.travelersCount,
    },
  });

  return inquiry;
}

export async function getTourInquiryByReference(reference: string) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return null;
  }
  return prisma.tourInquiry.findUnique({
    where: { reference },
    include: { tour: true },
  });
}

export function jsonListAsArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.values(value).map((item) => String(item)).filter(Boolean);
  }
  return [];
}

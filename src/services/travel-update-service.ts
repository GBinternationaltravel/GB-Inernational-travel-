import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function isActivePublished(now = new Date()): Prisma.TravelUpdateWhereInput {
  return {
    isPublished: true,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

export async function listPublishedTravelUpdates(input?: {
  type?: string;
  region?: string;
}) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return [];
  }

  const where: Prisma.TravelUpdateWhereInput = { ...isActivePublished() };

  if (
    input?.type &&
    ["FLIGHT", "ROAD", "WEATHER", "TOURISM", "ADVISORY"].includes(input.type)
  ) {
    where.type = input.type as Prisma.EnumTravelUpdateTypeFilter;
  }
  if (input?.region?.trim()) {
    where.region = { contains: input.region.trim(), mode: "insensitive" };
  }

  return prisma.travelUpdate.findMany({
    where,
    orderBy: [{ priority: "desc" }, { publishedAt: "desc" }],
  });
}

export async function getPublishedTravelUpdateBySlug(slug: string) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return null;
  }

  return prisma.travelUpdate.findFirst({
    where: {
      slug,
      ...isActivePublished(),
    },
  });
}

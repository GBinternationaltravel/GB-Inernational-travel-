import { prisma } from "@/lib/db";

export async function listPublishedVisaGuides() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return [];
  }
  return prisma.visaGuide.findMany({
    where: { isPublished: true },
    orderBy: [{ countryName: "asc" }],
  });
}

export async function getPublishedVisaGuideBySlug(slug: string) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return null;
  }
  return prisma.visaGuide.findFirst({
    where: { slug, isPublished: true },
  });
}

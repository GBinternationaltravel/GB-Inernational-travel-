import { prisma } from "@/lib/db";
import type { BookingRepository } from "@/lib/booking/repository";
import { PrismaBookingRepository } from "@/lib/booking/prisma-repository";
import { FileBookingRepository } from "@/lib/booking/file-repository";
import { requiresPrismaStores, warnIfFileStoreInProduction } from "@/lib/data-store";

let cached: { kind: "prisma" | "file"; repo: BookingRepository } | null = null;

async function canUsePrisma(): Promise<boolean> {
  if (process.env.BOOKING_STORE === "file") return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    if (process.env.BOOKING_STORE === "prisma") {
      console.error(
        "[booking-store] BOOKING_STORE=prisma but PostgreSQL is unreachable. Falling back is blocked in staging/production.",
      );
      if (requiresPrismaStores()) return false;
    }
    return false;
  }
}

export async function getBookingRepository(): Promise<{
  repo: BookingRepository;
  kind: "prisma" | "file";
}> {
  if (cached) return cached;
  const usePrisma = await canUsePrisma();
  if (!usePrisma) {
    if (process.env.BOOKING_STORE === "prisma" && requiresPrismaStores()) {
      throw new Error(
        "BOOKING_STORE=prisma but PostgreSQL is unreachable. Fix DATABASE_URL before serving staging/production traffic.",
      );
    }
    warnIfFileStoreInProduction("booking");
  }
  cached = usePrisma
    ? { kind: "prisma", repo: new PrismaBookingRepository() }
    : { kind: "file", repo: new FileBookingRepository() };
  return cached;
}

export function resetBookingRepositoryCache(): void {
  cached = null;
}

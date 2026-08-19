import { prisma } from "@/lib/db";
import { FilePaymentRepository } from "@/lib/payment/file-repository";
import { PrismaPaymentRepository } from "@/lib/payment/prisma-repository";
import type { PaymentRepository } from "@/lib/payment/repository";
import { requiresPrismaStores, warnIfFileStoreInProduction } from "@/lib/data-store";

export type PaymentStoreKind = "prisma" | "file";

let cached: { repo: PaymentRepository; kind: PaymentStoreKind } | null = null;

async function canUsePrisma(): Promise<boolean> {
  const forced = process.env.PAYMENT_STORE ?? process.env.BOOKING_STORE;
  if (forced === "file") return false;
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    if (forced === "prisma") {
      console.error(
        "[payment-store] PAYMENT_STORE/BOOKING_STORE=prisma but PostgreSQL is unreachable.",
      );
    }
    return false;
  }
}

export async function getPaymentRepository(): Promise<{
  repo: PaymentRepository;
  kind: PaymentStoreKind;
}> {
  if (cached) return cached;
  const usePrisma = await canUsePrisma();
  const forced = process.env.PAYMENT_STORE ?? process.env.BOOKING_STORE;
  if (!usePrisma) {
    if (forced === "prisma" && requiresPrismaStores()) {
      throw new Error(
        "PAYMENT_STORE=prisma but PostgreSQL is unreachable. Fix DATABASE_URL before serving staging/production traffic.",
      );
    }
    warnIfFileStoreInProduction("payments");
  }
  cached = usePrisma
    ? { repo: new PrismaPaymentRepository(), kind: "prisma" }
    : { repo: new FilePaymentRepository(), kind: "file" };
  return cached;
}

export function resetPaymentRepositoryCache(): void {
  cached = null;
}

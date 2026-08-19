import { prisma } from "@/lib/db";
import type { UserRepository } from "@/lib/auth/user-repository";
import { PrismaUserRepository } from "@/lib/auth/prisma-user-repository";
import { FileUserRepository } from "@/lib/auth/file-user-repository";
import { requiresPrismaStores, warnIfFileStoreInProduction } from "@/lib/data-store";

let cached: { kind: "prisma" | "file"; repo: UserRepository } | null = null;

async function canUsePrisma(): Promise<boolean> {
  if (process.env.AUTH_STORE === "file") return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    if (process.env.AUTH_STORE === "prisma") {
      console.error(
        "[auth-store] AUTH_STORE=prisma but PostgreSQL is unreachable.",
      );
    }
    return false;
  }
}

export async function getUserRepository(): Promise<{
  repo: UserRepository;
  kind: "prisma" | "file";
}> {
  if (cached) return cached;
  const usePrisma = await canUsePrisma();
  if (!usePrisma) {
    if (process.env.AUTH_STORE === "prisma" && requiresPrismaStores()) {
      throw new Error(
        "AUTH_STORE=prisma but PostgreSQL is unreachable. Fix DATABASE_URL before serving staging/production traffic.",
      );
    }
    warnIfFileStoreInProduction("auth");
  }
  cached = usePrisma
    ? { kind: "prisma", repo: new PrismaUserRepository() }
    : { kind: "file", repo: new FileUserRepository() };
  return cached;
}

export function resetUserRepositoryCache(): void {
  cached = null;
}

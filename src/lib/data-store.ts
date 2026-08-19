/**
 * Data store resolution helpers.
 * Staging and production must use PostgreSQL (Prisma). File stores are local-dev only.
 */

export type DataStoreKind = "prisma" | "file";

export type AppDeployEnv = "development" | "staging" | "production";

export type DataStoreStatus = {
  booking: DataStoreKind;
  auth: DataStoreKind;
  notificationsPreferPrisma: boolean;
  productionUsingFileStore: boolean;
  warning: string | null;
};

/**
 * Logical deploy environment.
 * Prefer APP_ENV when set; otherwise NODE_ENV=production → production,
 * else development. Staging hosts should set APP_ENV=staging (and usually
 * NODE_ENV=production for Next.js).
 */
export function getAppEnv(): AppDeployEnv {
  const raw = (process.env.APP_ENV ?? "").trim().toLowerCase();
  if (raw === "staging") return "staging";
  if (raw === "production") return "production";
  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}

/** True for staging or production — file fallback is not allowed. */
export function requiresPrismaStores(): boolean {
  const env = getAppEnv();
  return env === "staging" || env === "production";
}

/** @deprecated Prefer getAppEnv() / requiresPrismaStores() */
export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

export function buildFileStoreWarning(stores: {
  booking?: DataStoreKind;
  auth?: DataStoreKind;
  notifications?: DataStoreKind;
}): string | null {
  const usingFile = [stores.booking, stores.auth, stores.notifications].some(
    (kind) => kind === "file",
  );
  if (!usingFile) return null;
  if (requiresPrismaStores()) {
    return `${getAppEnv().toUpperCase()} WARNING: file storage is active. PostgreSQL must be the source of truth in staging/production. Set BOOKING_STORE=prisma AUTH_STORE=prisma NOTIFICATION_STORE=prisma PAYMENT_STORE=prisma and a reachable DATABASE_URL.`;
  }
  return "Development data store — local file fallback is active. Staging/production require PostgreSQL.";
}

/** Logs once per process when staging/production accidentally uses a file store. */
const warnedStores = new Set<string>();

export function warnIfFileStoreInProduction(store: string): void {
  if (!requiresPrismaStores()) return;
  if (warnedStores.has(store)) return;
  warnedStores.add(store);
  console.warn(
    `[data-store] ${getAppEnv().toUpperCase()} WARNING: "${store}" is using local file storage. PostgreSQL (DATABASE_URL) must be the source of truth.`,
  );
}

export async function resolveDataStoreStatus(): Promise<DataStoreStatus> {
  const { getBookingRepository } = await import("@/lib/booking/get-repository");
  const { getUserRepository } = await import("@/lib/auth/get-user-repository");
  const booking = await getBookingRepository();
  const auth = await getUserRepository();
  const notificationsPreferPrisma = process.env.NOTIFICATION_STORE !== "file";
  const productionUsingFileStore =
    requiresPrismaStores() &&
    (booking.kind === "file" || auth.kind === "file" || !notificationsPreferPrisma);

  return {
    booking: booking.kind,
    auth: auth.kind,
    notificationsPreferPrisma,
    productionUsingFileStore,
    warning: buildFileStoreWarning({
      booking: booking.kind,
      auth: auth.kind,
      notifications: notificationsPreferPrisma ? "prisma" : "file",
    }),
  };
}

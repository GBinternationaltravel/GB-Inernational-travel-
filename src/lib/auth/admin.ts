import { redirect } from "next/navigation";
import {
  hasAllPermissions,
  hasPermission,
  isStaffRole,
  type AdminPermission,
} from "@/lib/auth/permissions";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { requiresPrismaStores } from "@/lib/data-store";

export class AdminAuthError extends Error {
  constructor(
    message: string,
    readonly code: "UNAUTHORIZED" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export type AdminGateOptions = {
  /** Require all listed permissions (in addition to admin.access). */
  permissions?: AdminPermission | AdminPermission[];
};

function normalizePermissions(
  permissions?: AdminPermission | AdminPermission[],
): AdminPermission[] {
  if (!permissions) return ["admin.access"];
  const list = Array.isArray(permissions) ? permissions : [permissions];
  return list.includes("admin.access") ? list : ["admin.access", ...list];
}

/** Server-side staff gate for pages (redirects). */
export async function requireAdminPage(
  callbackUrl = "/admin",
  options?: AdminGateOptions,
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  const needed = normalizePermissions(options?.permissions);
  if (!isStaffRole(user.role) || !hasAllPermissions(user.role, needed)) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}&error=forbidden`);
  }
  return user;
}

/** Server-side staff gate for API routes. */
export async function requireAdminApi(
  options?: AdminGateOptions,
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AdminAuthError("Authentication required.", "UNAUTHORIZED");
  }
  const needed = normalizePermissions(options?.permissions);
  if (!isStaffRole(user.role) || !hasAllPermissions(user.role, needed)) {
    throw new AdminAuthError("Admin access required.", "FORBIDDEN");
  }
  return user;
}

/** Convenience: check a single permission on an already-authenticated admin. */
export function assertAdminPermission(
  user: SessionUser,
  permission: AdminPermission,
): void {
  if (!hasPermission(user.role, permission)) {
    throw new AdminAuthError("Admin access required.", "FORBIDDEN");
  }
}

/** Staging/production admin data must use Prisma — never file fallback. */
export function isProductionAdminStoreRequired(storeKind: string): boolean {
  return requiresPrismaStores() && storeKind !== "prisma";
}

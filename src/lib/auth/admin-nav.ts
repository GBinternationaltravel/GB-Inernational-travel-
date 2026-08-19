import type { UserRole } from "@prisma/client";
import {
  hasAnyPermission,
  type AdminPermission,
} from "@/lib/auth/permissions";
import { adminNav, type AdminNavItem } from "@/config/admin";

/** UI-only filter — never replace server-side requireAdminApi checks. */
export function filterAdminNavForRole(role: UserRole): AdminNavItem[] {
  return adminNav.filter((item) =>
    hasAnyPermission(role, item.permissions as AdminPermission[]),
  );
}

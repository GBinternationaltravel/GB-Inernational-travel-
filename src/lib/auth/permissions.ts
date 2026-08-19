import type { UserRole } from "@prisma/client";

/**
 * Server-side admin permission matrix.
 * Enforced in requireAdminApi / requireAdminPage — not UI-only.
 */
export type AdminPermission =
  | "admin.access"
  | "cms.manage"
  | "bookings.view"
  | "bookings.status"
  | "tickets.issue"
  | "payments.view"
  | "payments.verify"
  | "payments.refund"
  | "reports.view"
  | "reports.revenue"
  | "customers.manage"
  | "settings.manage"
  | "audit.view"
  | "permissions.manage"
  | "flights.manage";

const ALL_PERMISSIONS: AdminPermission[] = [
  "admin.access",
  "cms.manage",
  "bookings.view",
  "bookings.status",
  "tickets.issue",
  "payments.view",
  "payments.verify",
  "payments.refund",
  "reports.view",
  "reports.revenue",
  "customers.manage",
  "settings.manage",
  "audit.view",
  "permissions.manage",
  "flights.manage",
];

/** Full operators (legacy ADMIN kept for existing accounts). */
const FULL = ALL_PERMISSIONS;

/**
 * SUPPORT/STAFF/AGENT map onto practical capabilities without breaking CUSTOMER.
 */
const ROLE_PERMISSIONS: Record<UserRole, readonly AdminPermission[]> = {
  CUSTOMER: [],
  SUPER_ADMIN: FULL,
  ADMIN: FULL,
  MANAGER: [
    "admin.access",
    "cms.manage",
    "bookings.view",
    "bookings.status",
    "reports.view",
    "reports.revenue",
    "customers.manage",
    "audit.view",
    "flights.manage",
    "payments.view",
  ],
  TICKET_ISSUER: ["admin.access", "bookings.view", "tickets.issue"],
  ACCOUNTANT: [
    "admin.access",
    "payments.view",
    "payments.verify",
    "payments.refund",
    "reports.view",
    "reports.revenue",
    "audit.view",
  ],
  SUPPORT: [
    "admin.access",
    "cms.manage",
    "bookings.view",
    "bookings.status",
    "reports.view",
    "customers.manage",
    "audit.view",
    "flights.manage",
  ],
  STAFF: ["admin.access", "bookings.view", "tickets.issue", "bookings.status"],
  AGENT: ["admin.access", "bookings.view", "customers.manage"],
};

export const ASSIGNABLE_STAFF_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "TICKET_ISSUER",
  "ACCOUNTANT",
  "SUPPORT",
  "STAFF",
  "AGENT",
];

export function permissionsForRole(role: UserRole): readonly AdminPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: UserRole, permission: AdminPermission): boolean {
  return permissionsForRole(role).includes(permission);
}

export function hasAnyPermission(
  role: UserRole,
  permissions: readonly AdminPermission[],
): boolean {
  if (permissions.length === 0) return hasPermission(role, "admin.access");
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(
  role: UserRole,
  permissions: readonly AdminPermission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/** Any non-customer role that may enter the admin area. */
export function isStaffRole(role: UserRole): boolean {
  return hasPermission(role, "admin.access");
}

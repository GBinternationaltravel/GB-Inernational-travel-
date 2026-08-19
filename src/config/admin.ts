import type { AdminPermission } from "@/lib/auth/permissions";

export type AdminNavSection = "OPERATIONS" | "TRAVEL" | "MANAGEMENT";

export type AdminNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  section: AdminNavSection;
  /** Any of these permissions grants visibility (UI only). */
  permissions: readonly AdminPermission[];
};

/**
 * Admin sidebar items with permission hints for UI filtering.
 * Server/API authorization remains the security boundary.
 */
export const adminNav: readonly AdminNavItem[] = [
  // OPERATIONS
  { href: "/admin", label: "Dashboard", exact: true, section: "OPERATIONS", permissions: ["admin.access"] },
  { href: "/admin/bookings", label: "Bookings", section: "OPERATIONS", permissions: ["bookings.view"] },
  { href: "/admin/flights", label: "Flights", section: "OPERATIONS", permissions: ["flights.manage", "bookings.view"] },
  { href: "/admin/passengers", label: "Tickets / Passengers", section: "OPERATIONS", permissions: ["bookings.view"] },
  { href: "/admin/payments", label: "Payments", section: "OPERATIONS", permissions: ["payments.view"] },
  // TRAVEL
  { href: "/admin/airlines", label: "Airlines", section: "TRAVEL", permissions: ["cms.manage"] },
  { href: "/admin/airports", label: "Airports", section: "TRAVEL", permissions: ["cms.manage"] },
  { href: "/admin/destinations", label: "Destinations", section: "TRAVEL", permissions: ["cms.manage"] },
  { href: "/admin/tours", label: "Tours", section: "TRAVEL", permissions: ["cms.manage"] },
  { href: "/admin/visa-guides", label: "Visa", section: "TRAVEL", permissions: ["cms.manage"] },
  { href: "/admin/travel-updates", label: "Travel Updates", section: "TRAVEL", permissions: ["cms.manage"] },
  { href: "/admin/travel-guides", label: "Travel Guides", section: "TRAVEL", permissions: ["cms.manage"] },
  { href: "/admin/deals", label: "Deals", section: "TRAVEL", permissions: ["cms.manage"] },
  { href: "/admin/faqs", label: "FAQs", section: "TRAVEL", permissions: ["cms.manage"] },
  // MANAGEMENT
  { href: "/admin/customers", label: "Customers", section: "MANAGEMENT", permissions: ["customers.manage"] },
  { href: "/admin/reports", label: "Reports", section: "MANAGEMENT", permissions: ["reports.view"] },
  { href: "/admin/audit-logs", label: "Audit Logs", section: "MANAGEMENT", permissions: ["audit.view"] },
  { href: "/admin/notifications", label: "Notifications", section: "MANAGEMENT", permissions: ["bookings.view", "cms.manage"] },
  { href: "/admin/settings", label: "Settings", section: "MANAGEMENT", permissions: ["settings.manage"] },
] as const;

export const ADMIN_PAGE_SIZE = 20;

export const adminBookingStatuses = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "PAYMENT_RECEIVED",
  "TICKETING_PENDING",
  "CONFIRMED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
  "REFUNDED",
] as const;

export const adminPaymentStatuses = [
  "PENDING",
  "PROCESSING",
  "AUTHORIZED",
  "PAID",
  "CAPTURED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;

import { ADMIN_PAGE_SIZE } from "@/config/admin";
import { getUserRepository } from "@/lib/auth/get-user-repository";
import { isProductionAdminStoreRequired } from "@/lib/auth/admin";
import { getBookingRepository } from "@/lib/booking/get-repository";
import { getPaymentRepository } from "@/lib/payment/get-repository";
import { writeAuditLog } from "@/lib/security/audit";
import { AdminServiceError } from "@/services/admin-booking-service";

export type AdminCustomerListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  bookingCount: number;
  recentBooking: string | null;
  accountStatus: "Active" | "Disabled";
  role: string;
};

export type AdminCustomerDetail = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  preferredCurrency: string;
  preferredLanguage: string;
  bookings: Array<{
    reference: string;
    status: string;
    amount: number;
    currency: string;
    route: string;
    createdAt: string;
  }>;
  paymentSummary: {
    totalPayments: number;
    paidCount: number;
    failedCount: number;
    totalPaidAmount: number;
  };
  resetPasswordNote: string;
};

function displayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.email;
}

export async function listAdminCustomers(
  actorId: string,
  input: {
    page?: number;
    pageSize?: number;
    query?: string;
    status?: "active" | "disabled" | "all";
  },
) {
  const userStore = await getUserRepository();
  const bookingStore = await getBookingRepository();
  if (isProductionAdminStoreRequired(userStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const [users, bookings] = await Promise.all([
    userStore.repo.listAll(),
    bookingStore.repo.listAll(),
  ]);

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? ADMIN_PAGE_SIZE));
  const q = (input.query ?? "").trim().toLowerCase();
  const status = input.status ?? "all";

  let rows: AdminCustomerListItem[] = users
    .filter((user) => user.role === "CUSTOMER" || user.role === "ADMIN")
    .map((user) => {
      const userBookings = bookings
        .filter((booking) => booking.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return {
        id: user.id,
        name: displayName(user),
        email: user.email,
        phone: `${user.phoneCountryCode ?? ""} ${user.phone ?? ""}`.trim() || "—",
        createdAt: user.createdAt,
        bookingCount: userBookings.length,
        recentBooking: userBookings[0]?.reference ?? null,
        accountStatus: user.isActive === false ? "Disabled" : "Active",
        role: user.role,
      };
    });

  // Primary list focuses on customers; admins appear only when searched.
  if (!q) {
    rows = rows.filter((row) => row.role === "CUSTOMER");
  }

  if (q) {
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q),
    );
  }

  if (status === "active") rows = rows.filter((row) => row.accountStatus === "Active");
  if (status === "disabled") {
    rows = rows.filter((row) => row.accountStatus === "Disabled");
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);

  await writeAuditLog({
    userId: actorId,
    action: "ADMIN_CUSTOMERS_LISTED",
    entityType: "User",
    metadata: { query: q || null, page, total, store: userStore.kind },
  });

  return {
    store: userStore.kind,
    developmentDataStore: userStore.kind === "file",
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminCustomerDetail(actorId: string, id: string) {
  const userStore = await getUserRepository();
  const bookingStore = await getBookingRepository();
  const paymentStore = await getPaymentRepository();
  if (isProductionAdminStoreRequired(userStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const user = await userStore.repo.findById(id);
  if (!user) {
    throw new AdminServiceError("Customer not found.", "NOT_FOUND");
  }

  const bookings = (await bookingStore.repo.listAll()).filter(
    (booking) => booking.userId === user.id,
  );
  const bookingIds = new Set(bookings.map((booking) => booking.id));
  const payments = (await paymentStore.repo.listAll()).filter((payment) =>
    bookingIds.has(payment.bookingId),
  );

  await writeAuditLog({
    userId: actorId,
    action: "ADMIN_CUSTOMER_VIEWED",
    entityType: "User",
    entityId: user.id,
    metadata: { store: userStore.kind },
  });

  const detail: AdminCustomerDetail & {
    store: "prisma" | "file";
    developmentDataStore: boolean;
  } = {
    store: userStore.kind,
    developmentDataStore: userStore.kind === "file",
    id: user.id,
    name: displayName(user),
    email: user.email,
    phone: `${user.phoneCountryCode ?? ""} ${user.phone ?? ""}`.trim() || "—",
    role: user.role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    preferredCurrency: user.preferredCurrency,
    preferredLanguage: user.preferredLanguage,
    bookings: bookings.map((booking) => ({
      reference: booking.reference,
      status: booking.status,
      amount: booking.totalAmount,
      currency: booking.currency,
      route: booking.offerSnapshot
        ? `${booking.offerSnapshot.originCity} → ${booking.offerSnapshot.destinationCity}`
        : "—",
      createdAt: booking.createdAt,
    })),
    paymentSummary: {
      totalPayments: payments.length,
      paidCount: payments.filter((payment) => payment.status === "PAID").length,
      failedCount: payments.filter((payment) => payment.status === "FAILED").length,
      totalPaidAmount: payments
        .filter((payment) => payment.status === "PAID")
        .reduce((sum, payment) => sum + payment.amount, 0),
    },
    resetPasswordNote:
      "Password reset flow is prepared for a later security phase. Admins cannot view customer passwords.",
  };

  return detail;
}

export async function setAdminCustomerActive(input: {
  actorId: string;
  customerId: string;
  isActive: boolean;
}) {
  const userStore = await getUserRepository();
  if (isProductionAdminStoreRequired(userStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const user = await userStore.repo.findById(input.customerId);
  if (!user) {
    throw new AdminServiceError("Customer not found.", "NOT_FOUND");
  }
  if (user.role === "ADMIN" && !input.isActive) {
    throw new AdminServiceError("Cannot disable an admin account here.", "FORBIDDEN_ACTION");
  }

  const updated = await userStore.repo.setActive(input.customerId, input.isActive);
  if (!updated) {
    throw new AdminServiceError("Could not update account status.", "VALIDATION");
  }

  await writeAuditLog({
    userId: input.actorId,
    action: input.isActive ? "ADMIN_CUSTOMER_ENABLED" : "ADMIN_CUSTOMER_DISABLED",
    entityType: "User",
    entityId: user.id,
    metadata: { store: userStore.kind },
  });

  return {
    id: updated.id,
    isActive: updated.isActive,
  };
}

export async function setAdminUserRole(input: {
  actorId: string;
  userId: string;
  role: import("@prisma/client").UserRole;
}) {
  const { ASSIGNABLE_STAFF_ROLES } = await import("@/lib/auth/permissions");
  const userStore = await getUserRepository();
  if (isProductionAdminStoreRequired(userStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }
  if (!userStore.repo.setRole) {
    throw new AdminServiceError("Role updates are unavailable on this store.", "STORE");
  }
  if (input.role !== "CUSTOMER" && !ASSIGNABLE_STAFF_ROLES.includes(input.role)) {
    throw new AdminServiceError("Invalid role.", "VALIDATION");
  }

  const user = await userStore.repo.findById(input.userId);
  if (!user) {
    throw new AdminServiceError("User not found.", "NOT_FOUND");
  }
  if (user.id === input.actorId && input.role === "CUSTOMER") {
    throw new AdminServiceError("Cannot demote your own account.", "FORBIDDEN_ACTION");
  }

  const previousRole = user.role;
  const updated = await userStore.repo.setRole(input.userId, input.role);
  if (!updated) {
    throw new AdminServiceError("Could not update role.", "VALIDATION");
  }

  await writeAuditLog({
    userId: input.actorId,
    action: "ADMIN_USER_ROLE_CHANGED",
    entityType: "User",
    entityId: user.id,
    metadata: {
      previousRole,
      newRole: input.role,
      store: userStore.kind,
    },
  });

  return { id: updated.id, role: updated.role };
}

export const AdminCustomerService = {
  list: listAdminCustomers,
  get: getAdminCustomerDetail,
  setActive: setAdminCustomerActive,
  setRole: setAdminUserRole,
};

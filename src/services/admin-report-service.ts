import { ADMIN_PAGE_SIZE } from "@/config/admin";
import { isProductionAdminStoreRequired } from "@/lib/auth/admin";
import { getBookingRepository } from "@/lib/booking/get-repository";
import type { StoredBooking } from "@/lib/booking/repository";
import { getPaymentRepository } from "@/lib/payment/get-repository";
import type { StoredPayment } from "@/lib/payment/repository";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/security/audit";
import { AdminServiceError } from "@/services/admin-booking-service";

export type ReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  query?: string;
};

export type ReportSummary = {
  bookings: number;
  tickets: number;
  payments: number;
  revenue: number;
  currency: string;
  refunds: number;
  refundAmount: number;
  cancellations: number;
  airlineSales: Array<{ airline: string; bookings: number; revenue: number }>;
  destinationSales: Array<{ destination: string; bookings: number; revenue: number }>;
};

function parseDayStart(value?: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(`${value.trim()}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDayEnd(value?: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(`${value.trim()}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inRange(iso: string, from: Date | null, to: Date | null): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

function matchesQuery(booking: StoredBooking, q: string): boolean {
  if (!q) return true;
  const hay = [
    booking.reference,
    booking.contactEmail,
    booking.offerSnapshot?.airlineName,
    booking.offerSnapshot?.originCity,
    booking.offerSnapshot?.destinationCity,
    booking.offerSnapshot?.flightNumber,
    booking.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function paidStatuses(status: string): boolean {
  return status === "PAID" || status === "CAPTURED" || status === "AUTHORIZED";
}

function refundStatuses(status: string): boolean {
  return status === "REFUNDED";
}

async function countTicketsForBookings(bookingIds: string[]): Promise<number> {
  if (!bookingIds.length) return 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return prisma.ticket.count({
      where: { bookingId: { in: bookingIds } },
    });
  } catch {
    // File-store / no Ticket rows: approximate from confirmed bookings with ticketing status.
    return 0;
  }
}

async function loadFiltered(filters: ReportFilters): Promise<{
  bookings: StoredBooking[];
  payments: StoredPayment[];
  store: "prisma" | "file";
}> {
  const bookingStore = await getBookingRepository();
  const paymentStore = await getPaymentRepository();
  if (isProductionAdminStoreRequired(bookingStore.kind)) {
    throw new AdminServiceError("Production admin requires PostgreSQL.", "STORE");
  }

  const from = parseDayStart(filters.dateFrom);
  const to = parseDayEnd(filters.dateTo);
  const q = (filters.query ?? "").trim().toLowerCase();

  const allBookings = await bookingStore.repo.listAll();
  const bookings = allBookings.filter(
    (b) => inRange(b.createdAt, from, to) && matchesQuery(b, q),
  );
  const bookingIds = new Set(bookings.map((b) => b.id));

  const allPayments = await paymentStore.repo.listAll();
  const payments = allPayments.filter((p) => bookingIds.has(p.bookingId));

  return { bookings, payments, store: bookingStore.kind };
}

async function buildSummary(
  bookings: StoredBooking[],
  payments: StoredPayment[],
): Promise<ReportSummary> {
  const paidPayments = payments.filter((p) => paidStatuses(p.status));
  const refundedPayments = payments.filter((p) => refundStatuses(p.status));

  const revenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const refundAmount = refundedPayments.reduce((sum, p) => sum + p.amount, 0);
  const currency =
    paidPayments[0]?.currency ??
    refundedPayments[0]?.currency ??
    bookings[0]?.currency ??
    "PKR";

  const ticketCountFromDb = await countTicketsForBookings(bookings.map((b) => b.id));
  const ticketFallback = bookings.filter(
    (b) =>
      b.status === "CONFIRMED" &&
      Boolean(b.supplierTicketingStatus?.startsWith("ISSUED")),
  ).length;
  const tickets = ticketCountFromDb > 0 ? ticketCountFromDb : ticketFallback;

  const airlineMap = new Map<string, { bookings: number; revenue: number }>();
  const destinationMap = new Map<string, { bookings: number; revenue: number }>();
  const paymentByBooking = new Map<string, number>();
  for (const p of paidPayments) {
    paymentByBooking.set(
      p.bookingId,
      (paymentByBooking.get(p.bookingId) ?? 0) + p.amount,
    );
  }

  for (const booking of bookings) {
    const airline = booking.offerSnapshot?.airlineName?.trim() || "Unknown airline";
    const destination =
      booking.offerSnapshot?.destinationCity?.trim() || "Unknown destination";
    const bookingRevenue = paymentByBooking.get(booking.id) ?? 0;

    const a = airlineMap.get(airline) ?? { bookings: 0, revenue: 0 };
    a.bookings += 1;
    a.revenue += bookingRevenue;
    airlineMap.set(airline, a);

    const d = destinationMap.get(destination) ?? { bookings: 0, revenue: 0 };
    d.bookings += 1;
    d.revenue += bookingRevenue;
    destinationMap.set(destination, d);
  }

  return {
    bookings: bookings.length,
    tickets,
    payments: payments.length,
    revenue,
    currency,
    refunds: refundedPayments.length,
    refundAmount,
    cancellations: bookings.filter((b) => b.status === "CANCELLED").length,
    airlineSales: [...airlineMap.entries()]
      .map(([airline, v]) => ({ airline, ...v }))
      .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings),
    destinationSales: [...destinationMap.entries()]
      .map(([destination, v]) => ({ destination, ...v }))
      .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings),
  };
}

export async function getAdminReportSummary(
  actorId: string,
  filters: ReportFilters,
): Promise<{
  summary: ReportSummary;
  developmentDataStore: boolean;
  store: "prisma" | "file";
}> {
  const { bookings, payments, store } = await loadFiltered(filters);
  const summary = await buildSummary(bookings, payments);

  await writeAuditLog({
    userId: actorId,
    action: "ADMIN_REPORTS_VIEWED",
    entityType: "Report",
    metadata: {
      dateFrom: filters.dateFrom ?? null,
      dateTo: filters.dateTo ?? null,
      query: filters.query ?? null,
      bookings: summary.bookings,
      store,
    },
  });

  return {
    summary,
    store,
    developmentDataStore: store === "file",
  };
}

export type ReportExportType =
  | "bookings"
  | "payments"
  | "tickets"
  | "airline-sales"
  | "destination-sales"
  | "refunds"
  | "cancellations";

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export async function exportAdminReportCsv(
  actorId: string,
  type: ReportExportType,
  filters: ReportFilters,
): Promise<{ filename: string; csv: string }> {
  const { bookings, payments, store } = await loadFiltered(filters);
  const summary = await buildSummary(bookings, payments);

  let csv = "";
  let filename = `report-${type}.csv`;

  switch (type) {
    case "bookings": {
      csv = toCsv([
        [
          "reference",
          "status",
          "contactEmail",
          "totalAmount",
          "currency",
          "airline",
          "origin",
          "destination",
          "createdAt",
        ],
        ...bookings.map((b) => [
          b.reference,
          b.status,
          b.contactEmail,
          b.totalAmount,
          b.currency,
          b.offerSnapshot?.airlineName ?? "",
          b.offerSnapshot?.originCity ?? "",
          b.offerSnapshot?.destinationCity ?? "",
          b.createdAt,
        ]),
      ]);
      break;
    }
    case "payments": {
      const bookingRef = new Map(bookings.map((b) => [b.id, b.reference]));
      csv = toCsv([
        [
          "paymentId",
          "bookingReference",
          "amount",
          "currency",
          "status",
          "provider",
          "isMock",
          "createdAt",
        ],
        ...payments.map((p) => [
          p.id,
          bookingRef.get(p.bookingId) ?? "",
          p.amount,
          p.currency,
          p.status,
          p.provider ?? "",
          p.isMock ? "yes" : "no",
          p.createdAt,
        ]),
      ]);
      break;
    }
    case "refunds": {
      const bookingRef = new Map(bookings.map((b) => [b.id, b.reference]));
      const refunds = payments.filter((p) => refundStatuses(p.status));
      csv = toCsv([
        ["paymentId", "bookingReference", "amount", "currency", "createdAt"],
        ...refunds.map((p) => [
          p.id,
          bookingRef.get(p.bookingId) ?? "",
          p.amount,
          p.currency,
          p.createdAt,
        ]),
      ]);
      break;
    }
    case "cancellations": {
      const cancelled = bookings.filter((b) => b.status === "CANCELLED");
      csv = toCsv([
        ["reference", "contactEmail", "totalAmount", "currency", "createdAt"],
        ...cancelled.map((b) => [
          b.reference,
          b.contactEmail,
          b.totalAmount,
          b.currency,
          b.createdAt,
        ]),
      ]);
      break;
    }
    case "airline-sales": {
      csv = toCsv([
        ["airline", "bookings", "revenue"],
        ...summary.airlineSales.map((row) => [
          row.airline,
          row.bookings,
          row.revenue,
        ]),
      ]);
      break;
    }
    case "destination-sales": {
      csv = toCsv([
        ["destination", "bookings", "revenue"],
        ...summary.destinationSales.map((row) => [
          row.destination,
          row.bookings,
          row.revenue,
        ]),
      ]);
      break;
    }
    case "tickets": {
      let ticketRows: Array<Array<string | number>> = [];
      try {
        await prisma.$queryRaw`SELECT 1`;
        const ids = bookings.map((b) => b.id);
        const tickets =
          ids.length === 0
            ? []
            : await prisma.ticket.findMany({
                where: { bookingId: { in: ids } },
                include: { booking: { select: { reference: true } } },
                orderBy: { createdAt: "desc" },
                take: 5000,
              });
        ticketRows = tickets.map((t) => [
          t.id,
          t.booking.reference,
          t.ticketNumber ?? "",
          t.pnr ?? "",
          t.issuedAt?.toISOString() ?? "",
          t.createdAt.toISOString(),
        ]);
      } catch {
        ticketRows = bookings
          .filter((b) => b.supplierTicketingStatus?.startsWith("ISSUED"))
          .map((b) => [
            "",
            b.reference,
            "",
            b.supplierBookingRef ?? "",
            b.updatedAt,
            b.updatedAt,
          ]);
      }
      csv = toCsv([
        ["ticketId", "bookingReference", "ticketNumber", "pnr", "issuedAt", "createdAt"],
        ...ticketRows,
      ]);
      break;
    }
    default:
      throw new AdminServiceError("Unknown export type.", "VALIDATION");
  }

  await writeAuditLog({
    userId: actorId,
    action: "ADMIN_REPORT_EXPORTED",
    entityType: "Report",
    entityId: type,
    metadata: {
      type,
      dateFrom: filters.dateFrom ?? null,
      dateTo: filters.dateTo ?? null,
      query: filters.query ?? null,
      store,
      pageSizeHint: ADMIN_PAGE_SIZE,
    },
  });

  filename = `gb-${type}-${filters.dateFrom ?? "all"}-${filters.dateTo ?? "all"}.csv`;
  return { filename, csv };
}

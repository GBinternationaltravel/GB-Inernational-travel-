import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  exportAdminReportCsv,
  type ReportExportType,
} from "@/services/admin-report-service";

const querySchema = z.object({
  type: z.enum([
    "bookings",
    "payments",
    "tickets",
    "airline-sales",
    "destination-sales",
    "refunds",
    "cancellations",
  ]),
  dateFrom: z.string().trim().max(32).optional(),
  dateTo: z.string().trim().max(32).optional(),
  query: z.string().trim().max(200).optional(),
});

const revenueTypes = new Set([
  "airline-sales",
  "destination-sales",
  "payments",
  "refunds",
]);

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:reports-export:${ip}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "reports.view" });
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      type: url.searchParams.get("type") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    if (revenueTypes.has(parsed.data.type) && !hasPermission(admin.role, "reports.revenue")) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { filename, csv } = await exportAdminReportCsv(
      admin.id,
      parsed.data.type as ReportExportType,
      {
        dateFrom: parsed.data.dateFrom,
        dateTo: parsed.data.dateTo,
        query: parsed.data.query,
      },
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not export report.");
  }
}

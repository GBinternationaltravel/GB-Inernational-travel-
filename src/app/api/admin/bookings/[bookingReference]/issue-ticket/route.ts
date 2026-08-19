import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { adminCmsErrorResponse } from "@/lib/cms/admin-api";
import { rateLimit } from "@/lib/security/rate-limit";
import { issueTicketManually } from "@/services/ticket-issuer-service";

type Params = { params: Promise<{ bookingReference: string }> };

const bodySchema = z.object({
  pnr: z.string().trim().min(5).max(12),
  ticketNumbers: z.array(z.string().trim().min(3).max(32)).max(9).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`admin:issue-ticket:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const admin = await requireAdminApi({ permissions: "tickets.issue" });
    const { bookingReference } = await params;
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    const result = await issueTicketManually({
      actorId: admin.id,
      bookingReference: decodeURIComponent(bookingReference),
      pnr: parsed.data.pnr,
      ticketNumbers: parsed.data.ticketNumbers,
      notes: parsed.data.notes,
    });
    return NextResponse.json(result);
  } catch (error) {
    return adminCmsErrorResponse(error, "Could not issue ticket.");
  }
}

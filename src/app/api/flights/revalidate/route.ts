import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
import { revalidateFlightOffer, toCustomerSupplierMessage } from "@/services/flight-service";
import {
  calculateAgencyMarkup,
  calculateOfferPriceSnapshot,
} from "@/lib/booking/pricing";

const bodySchema = z.object({
  internalOfferId: z.string().min(3),
  supplierOfferId: z.string().min(1),
  supplierCode: z.string().min(1),
  supplierSessionRef: z.string().optional().nullable(),
  /** Supplier fare before agency markup (not customer total). */
  expectedTotal: z.number().positive().optional(),
  currency: z.string().optional(),
});

/**
 * Offer revalidation endpoint — prepares production flow without changing payment yet.
 * Supplier amounts are converted to customer totals (with markup) for UI/accept flows.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`flights:revalidate:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid revalidation request." }, { status: 400 });
  }

  try {
    const result = await revalidateFlightOffer(parsed.data);
    const customerPrevious =
      typeof result.previousTotal === "number"
        ? calculateAgencyMarkup(result.previousTotal).customerTotal
        : undefined;
    const customerCurrent = result.offer
      ? calculateOfferPriceSnapshot(result.offer).total
      : typeof result.currentTotal === "number"
        ? calculateAgencyMarkup(result.currentTotal).customerTotal
        : undefined;

    return NextResponse.json({
      ...result,
      /** Supplier fare before markup (for diagnostics only). */
      supplierPreviousTotal: result.previousTotal,
      supplierCurrentTotal: result.currentTotal,
      previousTotal: customerPrevious,
      currentTotal: customerCurrent,
    });
  } catch (error) {
    return NextResponse.json(
      { error: toCustomerSupplierMessage(error), ok: false, status: "FAILED" },
      { status: 502 },
    );
  }
}

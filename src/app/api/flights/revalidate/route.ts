import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
import { revalidateFlightOffer, toCustomerSupplierMessage } from "@/services/flight-service";
import {
  calculateAgencyMarkup,
  calculateCombinedOfferPriceSnapshot,
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
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  returnInternalOfferId: z.string().min(3).optional(),
  returnSupplierOfferId: z.string().min(1).optional(),
  returnSupplierCode: z.string().min(1).optional(),
  returnSupplierSessionRef: z.string().optional().nullable(),
  returnExpectedTotal: z.number().positive().optional(),
  returnDepartureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
    const outbound = await revalidateFlightOffer({
      internalOfferId: parsed.data.internalOfferId,
      supplierOfferId: parsed.data.supplierOfferId,
      supplierCode: parsed.data.supplierCode,
      supplierSessionRef: parsed.data.supplierSessionRef,
      expectedTotal: parsed.data.expectedTotal,
      currency: parsed.data.currency,
      departureDate: parsed.data.departureDate,
    });

    if (!parsed.data.returnInternalOfferId) {
      const customerPrevious =
        typeof outbound.previousTotal === "number"
          ? calculateAgencyMarkup(outbound.previousTotal).customerTotal
          : undefined;
      const customerCurrent = outbound.offer
        ? calculateOfferPriceSnapshot(outbound.offer).total
        : typeof outbound.currentTotal === "number"
          ? calculateAgencyMarkup(outbound.currentTotal).customerTotal
          : undefined;

      return NextResponse.json({
        ...outbound,
        supplierPreviousTotal: outbound.previousTotal,
        supplierCurrentTotal: outbound.currentTotal,
        previousTotal: customerPrevious,
        currentTotal: customerCurrent,
      });
    }

    const inbound = await revalidateFlightOffer({
      internalOfferId: parsed.data.returnInternalOfferId,
      supplierOfferId: parsed.data.returnSupplierOfferId ?? parsed.data.returnInternalOfferId,
      supplierCode: parsed.data.returnSupplierCode ?? parsed.data.supplierCode,
      supplierSessionRef: parsed.data.returnSupplierSessionRef,
      expectedTotal: parsed.data.returnExpectedTotal,
      currency: parsed.data.currency,
      departureDate: parsed.data.returnDepartureDate,
    });

    const blocked = [outbound, inbound].find(
      (result) => result.status === "EXPIRED" || result.status === "NO_AVAILABILITY",
    );
    if (blocked) {
      return NextResponse.json({
        ...blocked,
        previousTotal: undefined,
        currentTotal: undefined,
      });
    }

    const supplierPrevious =
      (outbound.previousTotal ?? 0) + (inbound.previousTotal ?? 0);
    const supplierCurrent =
      outbound.offer && inbound.offer
        ? Math.round(outbound.offer.totalPrice) + Math.round(inbound.offer.totalPrice)
        : (outbound.currentTotal ?? 0) + (inbound.currentTotal ?? 0);
    const customerPrevious = calculateAgencyMarkup(supplierPrevious).customerTotal;
    const customerCurrent =
      outbound.offer && inbound.offer
        ? calculateCombinedOfferPriceSnapshot([outbound.offer, inbound.offer]).total
        : calculateAgencyMarkup(supplierCurrent).customerTotal;
    const changed =
      outbound.status === "PRICE_CHANGED" || inbound.status === "PRICE_CHANGED";

    return NextResponse.json({
      ok: !changed && outbound.ok && inbound.ok,
      status: changed ? "PRICE_CHANGED" : outbound.status,
      offer: outbound.offer,
      message: outbound.message,
      isMock: outbound.isMock || inbound.isMock,
      supplierPreviousTotal: supplierPrevious,
      supplierCurrentTotal: supplierCurrent,
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

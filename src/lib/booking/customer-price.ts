import { calculateOfferPriceSnapshot } from "@/lib/booking/pricing";
import type { FlightOffer } from "@/types/flight";

/**
 * Customer-facing price display helpers.
 *
 * Customers only ever see one all-inclusive fare: the GB service fee is already
 * folded into it and is never shown as its own line, amount or wording. The fee is
 * still calculated (src/lib/booking/pricing.ts) and stored on the booking exactly as
 * before; the admin pages keep the full supplier fare / service fee / total breakdown.
 */

/** Label for the single, all-inclusive fare line customers see. */
export const CUSTOMER_FARE_LABEL = "Fare (incl. taxes & fees)";

/** What the customer pays for an offer (fee included). Use for display, sorting and filters. */
export function customerOfferTotal(offer: FlightOffer): number {
  return calculateOfferPriceSnapshot(offer).total;
}

/**
 * Customer-safe pricing notice. Use instead of the stored snapshot `notice`, which
 * describes the service fee and is meant for admin pages only.
 */
export function customerPricingNotice(isMock: boolean): string {
  return isMock
    ? "Mock pricing for development. The price shown includes all taxes and fees. Not a live airline ticket."
    : "The price shown includes all taxes and fees. Amount is revalidated before payment. Payment is not ticket confirmation.";
}

import { calculateOfferPriceSnapshot } from "@/lib/booking/pricing";
import type { FlightOffer } from "@/types/flight";

/**
 * Customer-facing price display helpers.
 *
 * Customers see one published fare: the GB service fee is already folded into it
 * and is never shown as its own line or amount. The fee is still calculated
 * (src/lib/booking/pricing.ts) and stored on the booking exactly as before; the
 * admin pages keep the full supplier fare / service fee / total breakdown.
 */

/** Label for the single published fare line customers see. */
export const CUSTOMER_FARE_LABEL = "Published fare";

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
    ? "Development inventory pricing. Not a live airline ticket. Confirm the fare with our team before booking."
    : "The published fare should be confirmed with our team before a booking is finalized. Online card payment is not available yet. A payment is not a ticket.";
}

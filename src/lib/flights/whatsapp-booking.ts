import { siteConfig } from "@/config/site";
import { whatsappHref } from "@/lib/contact-links";
import { absoluteUrl } from "@/lib/seo/metadata";
import { formatPrice } from "@/lib/flights/filter-sort";

export function bookOnWhatsAppHref(input: {
  origin: string;
  destination: string;
  date: string;
  airline: string;
  flightTime: string;
  passengers: string;
  /** Customer total. Omit when there is no published fare. */
  farePkr?: number | null;
  currency?: string;
  pagePath: string;
}): string {
  const lines = [
    `Hi ${siteConfig.name}, I would like to book this flight.`,
    `Route: ${input.origin} to ${input.destination}`,
    `Date: ${input.date}`,
    `Airline: ${input.airline}`,
    `Flight time: ${input.flightTime}`,
    `Passengers: ${input.passengers}`,
  ];
  if (typeof input.farePkr === "number") {
    lines.push(`Fare: ${formatPrice(input.farePkr, input.currency ?? "PKR")}`);
  }
  lines.push(`Page: ${absoluteUrl(input.pagePath)}`);
  lines.push("This is a request, not a ticket.");
  return whatsappHref(siteConfig.contactWhatsApp, lines.join("\n"));
}

export function quoteOnWhatsAppHref(input: {
  origin: string;
  destination: string;
  pagePath: string;
  note?: string;
  /** Replaces the first line when the page is not a simple origin–destination quote. */
  intro?: string;
}): string {
  const lines = [
    input.intro ?? `Hi ${siteConfig.name}, please quote ${input.origin} to ${input.destination}.`,
    input.note ?? "I could not see a published fare on the page.",
    `Page: ${absoluteUrl(input.pagePath)}`,
    "This is a quote request, not a ticket.",
  ];
  return whatsappHref(siteConfig.contactWhatsApp, lines.join("\n"));
}

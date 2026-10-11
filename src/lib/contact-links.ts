import { siteConfig } from "@/config/site";

/**
 * Clickable links for the public contact channels in `siteConfig`
 * (phone, WhatsApp and email). Safe to use in server and client components.
 */

/** `tel:` link, e.g. "+92 346 2559008" → "tel:+923462559008". */
export function telHref(raw: string = siteConfig.contactPhone): string {
  return `tel:${raw.replace(/[^\d+]/g, "")}`;
}

/** WhatsApp click-to-chat link, optionally with a pre-filled message. */
export function whatsappHref(raw: string = siteConfig.contactWhatsApp, text?: string): string {
  const url = `https://wa.me/${raw.replace(/\D/g, "")}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
}

/** `mailto:` link, optionally with a subject and body. */
export function mailtoHref(
  email: string = siteConfig.contactEmail,
  options: { subject?: string; body?: string } = {},
): string {
  const params: string[] = [];
  if (options.subject) params.push(`subject=${encodeURIComponent(options.subject)}`);
  if (options.body) params.push(`body=${encodeURIComponent(options.body)}`);
  return `mailto:${email}${params.length ? `?${params.join("&")}` : ""}`;
}

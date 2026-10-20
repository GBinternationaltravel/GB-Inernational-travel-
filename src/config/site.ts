import { getPublicAppUrl } from "@/config/app-url";

/** Public brand. Use this everywhere a customer can see the company name. */
export const brandName = "GB International Travel";

/** Blank env values must not wipe the public fallback (a set-but-empty string is not "missing"). */
function envOr(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export const siteConfig = {
  name: brandName,
  shortName: brandName,
  description:
    "Pakistan-based travel and flight booking portal for domestic and international journeys.",
  url: getPublicAppUrl(),
  locale: envOr(process.env.NEXT_PUBLIC_DEFAULT_LOCALE, "en"),
  currency: envOr(process.env.NEXT_PUBLIC_DEFAULT_CURRENCY, "PKR"),
  market: "Pakistan",
  futureLocales: ["ur", "ar"] as const,
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "gb.intltravel@gmail.com",
  /** Public contact channels (overridable via NEXT_PUBLIC_*; blank values fall back to these). */
  contactPhone: envOr(process.env.NEXT_PUBLIC_CONTACT_PHONE, "+92 346 2559008"),
  contactPhoneLabel: "Call (Pakistan)",
  contactWhatsApp: envOr(process.env.NEXT_PUBLIC_CONTACT_WHATSAPP, "+971 52 205 1485"),
  contactWhatsAppLabel: "WhatsApp (UAE)",
  /**
   * Future Pakistan WhatsApp number. Stays blank until the owner publishes one.
   * Do not invent a number. NEXT_PUBLIC_CONTACT_WHATSAPP_PK
   */
  contactWhatsAppPakistan: envOr(process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_PK, ""),
  /**
   * Shown on the trust strip. Blank stays as the placeholder token until the owner sets a real reply time.
   * NEXT_PUBLIC_RESPONSE_TIME
   */
  responseTime: envOr(process.env.NEXT_PUBLIC_RESPONSE_TIME, "{{RESPONSE_TIME}}"),
  /** Rendered on About only when the owner publishes them. Do not invent values. */
  legalName: envOr(process.env.NEXT_PUBLIC_LEGAL_NAME, ""),
  officeAddress: envOr(process.env.NEXT_PUBLIC_OFFICE_ADDRESS, ""),
  licenceNumber: envOr(process.env.NEXT_PUBLIC_LICENCE, ""),
  accreditation: envOr(process.env.NEXT_PUBLIC_ACCREDITATION, ""),
  reviewsSummary: envOr(process.env.NEXT_PUBLIC_REVIEWS_SUMMARY, ""),
  social: {
    twitter: "",
    facebook: "",
    instagram: "",
  },
} as const;

/** Primary public navigation — keep lightweight. */
export const navigation = [
  { label: "Flights", href: "/flights" },
  { label: "Tours", href: "/tours" },
  { label: "Visa", href: "/visa" },
  { label: "Destinations", href: "/destinations" },
  { label: "Travel Updates", href: "/travel-updates" },
  { label: "Travel Guides", href: "/travel-guides" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerNavigation = {
  travel: [
    { label: "Flights", href: "/flights" },
    { label: "Domestic Flights", href: "/flights/domestic" },
    { label: "International Flights", href: "/flights/international" },
    { label: "Tours", href: "/tours" },
    { label: "Destinations", href: "/destinations" },
    { label: "Travel Updates", href: "/travel-updates" },
    { label: "Visa Information", href: "/visa" },
    { label: "Travel Guides", href: "/travel-guides" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "FAQ", href: "/faq" },
    { label: "Deals", href: "/deals" },
    { label: "Flight Status", href: "/flight-status" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms", href: "/terms" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Cancellation Policy", href: "/cancellation-policy" },
  ],
} as const;

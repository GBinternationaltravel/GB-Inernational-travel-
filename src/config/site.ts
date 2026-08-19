export const siteConfig = {
  name: "GB International Travel",
  shortName: "GB Travel",
  description:
    "Pakistan-based travel and flight booking portal for domestic and international journeys.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en",
  currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "PKR",
  market: "Pakistan",
  futureLocales: ["ur", "ar"] as const,
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "gb.intltravel@gmail.com",
  /** Public contact channels for Quick Assistance (overridable via NEXT_PUBLIC_*). */
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+92 346 2559008",
  contactWhatsApp:
    process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "+971 52 205 1485",
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
    { label: "My Trips", href: "/my-trips" },
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

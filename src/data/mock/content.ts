import type { DestinationSummary, FaqItem } from "@/types/content";

/**
 * Foundation content placeholders.
 * Avoid fabricated company stats, reviews, or live travel facts.
 */

export const popularDomesticDestinations: DestinationSummary[] = [
  {
    slug: "karachi",
    name: "Karachi",
    country: "Pakistan",
    summary: "Pakistan’s largest city and a major domestic flight hub.",
    isDomestic: true,
  },
  {
    slug: "lahore",
    name: "Lahore",
    country: "Pakistan",
    summary: "Cultural capital with strong domestic air connections.",
    isDomestic: true,
  },
  {
    slug: "islamabad",
    name: "Islamabad",
    country: "Pakistan",
    summary: "Capital city and gateway for northern travel.",
    isDomestic: true,
  },
];

export const popularInternationalDestinations: DestinationSummary[] = [
  {
    slug: "dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    summary: "Popular international destination from Pakistan.",
    isDomestic: false,
  },
  {
    slug: "jeddah",
    name: "Jeddah",
    country: "Saudi Arabia",
    summary: "Key gateway for travel to Saudi Arabia.",
    isDomestic: false,
  },
  {
    slug: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    summary: "Connecting hub between Pakistan and Europe.",
    isDomestic: false,
  },
];

export const foundationFaqs: FaqItem[] = [
  {
    id: "faq-1",
    question: "What can I do on GB International Travel today?",
    answer:
      "This foundation phase provides the website structure, search UI shell, and architecture. Live airline booking will be added in later phases.",
    category: "general",
  },
  {
    id: "faq-2",
    question: "Are the flight prices on this site live?",
    answer:
      "No. Current flight results use clearly labeled mock data for development. Real supplier inventory will be connected later.",
    category: "flights",
  },
  {
    id: "faq-3",
    question: "Which currency will bookings use?",
    answer:
      "The primary market currency is Pakistani Rupee (PKR). Additional currencies may be supported later.",
    category: "payments",
  },
  {
    id: "faq-4",
    question: "Will Urdu and Arabic be supported?",
    answer:
      "English is the initial language. Urdu and Arabic are planned for future localization phases.",
    category: "general",
  },
];

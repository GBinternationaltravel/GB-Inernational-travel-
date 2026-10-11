import type { DestinationSummary, FaqItem } from "@/types/content";

/**
 * Public FAQ and destination placeholders.
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
    question: "What can I do on this website today?",
    answer:
      "You can search flights we currently publish, send a booking request, and contact our team on WhatsApp or phone. We confirm availability and issue tickets manually. Online card payment is not available yet.",
    category: "general",
  },
  {
    id: "faq-2",
    question: "Are these airline-confirmed live fares?",
    answer:
      "No. The fares shown are from the flight inventory currently published by GB International Travel. They are not a live airline or GDS feed. Availability and the final price should be confirmed with our team before a booking is finalized.",
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
  {
    id: "faq-5",
    question: "Can I pay by card on this website?",
    answer:
      "Online card payment is not available yet. Our team will tell you the accepted payment methods after they confirm your flight. A payment is not a confirmed ticket.",
    category: "payments",
  },
  {
    id: "faq-6",
    question: "When do I receive my e-ticket?",
    answer:
      "We issue e-tickets and airline PNRs manually after we confirm the flight and the booking. A booking request is not a ticket.",
    category: "flights",
  },
];

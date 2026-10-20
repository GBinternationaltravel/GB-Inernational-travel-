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
    question: "What happens after I send a booking request?",
    answer:
      "Our team checks the flight and the published fare, then contacts you. The request is not a ticket and it does not hold a seat by itself.",
    category: "flights",
  },
  {
    id: "faq-2",
    question: "Is the price on the website the final price?",
    answer:
      "The price is a published PKR fare, including the amount we add for the booking. It is confirmed before ticketing. It is not a live airline fare.",
    category: "flights",
  },
  {
    id: "faq-3",
    question: "Can I pay by card on this website?",
    answer:
      "Online card payment is not available. After we confirm the flight, we tell you how to pay. A payment is not a ticket until the e-ticket is issued.",
    category: "payments",
  },
  {
    id: "faq-4",
    question: "When do I receive the e-ticket?",
    answer:
      "We issue the e-ticket manually after the flight and the fare are confirmed. You will receive it from our team, not at the moment you submit the form.",
    category: "flights",
  },
  {
    id: "faq-5",
    question: "What if I need to change or cancel?",
    answer:
      "Contact us before you travel. Airline fare rules decide what can be changed or refunded after a ticket is issued. Ask us to check your ticket rather than assuming a refund amount.",
    category: "flights",
  },
  {
    id: "faq-6",
    question: "Which currency do you quote?",
    answer:
      "Published fares are in Pakistani rupees (PKR) for the Pakistan market.",
    category: "payments",
  },
];

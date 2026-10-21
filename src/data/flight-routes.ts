export type FlightRoutePage = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  origin: string;
  destination: string;
  originCity: string;
  destinationCity: string;
  intro: string;
  detail: string;
  related: Array<{ href: string; label: string }>;
};

/** Distinct route guides. Published fares are loaded from inventory, never invented. */
export const flightRoutePages: FlightRoutePage[] = [
  {
    slug: "islamabad-skardu",
    title: "Islamabad to Skardu flights",
    h1: "Flights from Islamabad to Skardu",
    description:
      "Request an Islamabad (ISB) to Skardu (KDU) flight in PKR. Published fares are confirmed by GB International Travel before ticketing.",
    origin: "ISB",
    destination: "KDU",
    originCity: "Islamabad",
    destinationCity: "Skardu",
    intro:
      "Skardu Airport (KDU) is the commercial airport for Skardu. This page is for travellers starting in Islamabad (ISB) who want a published PKR fare checked by our team.",
    detail:
      "Northern flights can change with the weather. A fare on the results page is not a seat and not a ticket. Tell us your date and we will confirm what is published before anyone issues an e-ticket.",
    related: [
      { href: "/destinations/pakistan/skardu", label: "Skardu destination guide" },
      { href: "/flights/skardu-islamabad", label: "Skardu to Islamabad" },
      { href: "/travel-updates/northern-flights", label: "Note on northern flights" },
    ],
  },
  {
    slug: "islamabad-gilgit",
    title: "Islamabad to Gilgit flights",
    h1: "Flights from Islamabad to Gilgit",
    description:
      "Request an Islamabad (ISB) to Gilgit (GIL) flight in PKR. GB International Travel confirms the published fare before ticketing.",
    origin: "ISB",
    destination: "GIL",
    originCity: "Islamabad",
    destinationCity: "Gilgit",
    intro:
      "Gilgit Airport (GIL) serves Gilgit. Hunza does not have its own commercial airport, so some Hunza trips start with this flight and continue by road.",
    detail:
      "We do not publish a drive time from Gilgit to Hunza. Ask our tours team about a road transfer, and ask us to confirm the flight before you treat a fare as available.",
    related: [
      { href: "/destinations/pakistan/gilgit", label: "Gilgit destination guide" },
      { href: "/destinations/pakistan/hunza", label: "Hunza, via Gilgit" },
      { href: "/flights/gilgit-islamabad", label: "Gilgit to Islamabad" },
    ],
  },
  {
    slug: "skardu-islamabad",
    title: "Skardu to Islamabad flights",
    h1: "Flights from Skardu to Islamabad",
    description:
      "Request a Skardu (KDU) to Islamabad (ISB) flight in PKR. The return to Islamabad is confirmed by our team before an e-ticket is issued.",
    origin: "KDU",
    destination: "ISB",
    originCity: "Skardu",
    destinationCity: "Islamabad",
    intro:
      "This page is the Skardu departure, not the flight into Skardu. Use it when you are leaving Skardu Airport (KDU) for Islamabad (ISB).",
    detail:
      "Weather can still change a departure from Skardu. Search the published fare, then send a booking request. We check the flight before ticketing.",
    related: [
      { href: "/flights/islamabad-skardu", label: "Islamabad to Skardu" },
      { href: "/destinations/pakistan/skardu", label: "Skardu destination guide" },
    ],
  },
  {
    slug: "gilgit-islamabad",
    title: "Gilgit to Islamabad flights",
    h1: "Flights from Gilgit to Islamabad",
    description:
      "Request a Gilgit (GIL) to Islamabad (ISB) flight in PKR. GB International Travel confirms availability before ticketing.",
    origin: "GIL",
    destination: "ISB",
    originCity: "Gilgit",
    destinationCity: "Islamabad",
    intro:
      "This page is for departures from Gilgit Airport (GIL) to Islamabad (ISB). It is a different search from the flight that lands in Gilgit.",
    detail:
      "If your group is coming from Hunza by road, tell us that when you request the flight. We do not invent a connection time between the road and the airport.",
    related: [
      { href: "/flights/islamabad-gilgit", label: "Islamabad to Gilgit" },
      { href: "/destinations/pakistan/gilgit", label: "Gilgit destination guide" },
    ],
  },
  {
    slug: "islamabad-dubai",
    title: "Islamabad to Dubai flights",
    h1: "Flights from Islamabad to Dubai",
    description:
      "Request an Islamabad (ISB) to Dubai (DXB) flight in PKR. The fare is published by GB International Travel and confirmed before ticketing.",
    origin: "ISB",
    destination: "DXB",
    originCity: "Islamabad",
    destinationCity: "Dubai",
    intro:
      "Dubai (DXB) is an international trip from Islamabad (ISB). Passport and any UAE entry rules are your responsibility. We do not approve a visa on this page.",
    detail:
      "Search the published PKR fare and send a booking request. Our team confirms the flight and tells you what to arrange for travel documents. A request is not a ticket.",
    related: [
      { href: "/destinations/united-arab-emirates/dubai", label: "Dubai destination guide" },
      { href: "/visa", label: "Visa information" },
      { href: "/travel-updates/visa-checklist", label: "Visa note" },
    ],
  },
  {
    slug: "lahore-jeddah",
    title: "Lahore to Jeddah flights",
    h1: "Flights from Lahore to Jeddah",
    description:
      "Request a Lahore (LHE) to Jeddah (JED) flight in PKR for Umrah or another Saudi trip. GB International Travel confirms the fare before ticketing.",
    origin: "LHE",
    destination: "JED",
    originCity: "Lahore",
    destinationCity: "Jeddah",
    intro:
      "Jeddah (JED) is a common airport for travellers from Lahore (LHE), including people going for Umrah. This page does not include a hotel, a visa, or a confirmed seat.",
    detail:
      "Umrah rules change. TODO: verify any document list with our team before you travel. Search the published fare, then ask us to confirm the flight and what still needs a separate check.",
    related: [
      { href: "/destinations/saudi-arabia/jeddah", label: "Jeddah destination guide" },
      { href: "/travel-updates/umrah-from-pakistan", label: "Umrah note" },
      { href: "/tours", label: "Tours" },
    ],
  },
];

export function getFlightRoutePage(slug: string): FlightRoutePage | undefined {
  return flightRoutePages.find((route) => route.slug === slug);
}

import type { FaqItem } from "@/types/content";

export type DestinationRoute = {
  fromIata: string;
  fromCity: string;
  label: string;
};

export type DestinationCity = {
  citySlug: string;
  cityName: string;
  countrySlug: string;
  countryName: string;
  iataCode: string;
  airportName: string;
  isDomestic: boolean;
  summary: string;
  bestFor: string;
  bestTimeToVisit: string;
  visaInfo: string;
  travelTips: string[];
  popularRoutes: DestinationRoute[];
  relatedCitySlugs: string[];
  faqs: FaqItem[];
  relatedFlightSearch: {
    from?: string;
    to: string;
  };
};

export type DestinationCountry = {
  countrySlug: string;
  countryName: string;
  summary: string;
  cities: string[];
};

const defaultVisa = (cityName: string, isDomestic: boolean) =>
  isDomestic
    ? `Domestic travel to ${cityName} typically requires a valid CNIC or passport as required by the airline. Confirm carrier document rules before departure.`
    : `Visa and entry rules for ${cityName} depend on nationality and travel purpose. This page does not provide official immigration advice — verify requirements with the relevant embassy or authorized source before booking non-flexible fares.`;

const city = (
  input: Omit<
    DestinationCity,
    "faqs" | "bestTimeToVisit" | "visaInfo" | "airportName" | "popularRoutes" | "relatedCitySlugs"
  > &
    Partial<
      Pick<
        DestinationCity,
        | "faqs"
        | "bestTimeToVisit"
        | "visaInfo"
        | "airportName"
        | "popularRoutes"
        | "relatedCitySlugs"
      >
    >,
): DestinationCity => {
  const from = input.relatedFlightSearch.from ?? "ISB";
  return {
    ...input,
    airportName: input.airportName ?? `${input.cityName} International Airport`,
    bestTimeToVisit:
      input.bestTimeToVisit ??
      (input.isDomestic
        ? "October to March is generally more comfortable for many Pakistan city trips; always check seasonal schedules."
        : "Shoulder seasons often balance weather and demand; confirm local seasons before locking travel dates."),
    visaInfo: input.visaInfo ?? defaultVisa(input.cityName, input.isDomestic),
    popularRoutes: input.popularRoutes ?? [
      {
        fromIata: from,
        fromCity: from,
        label: `${from} → ${input.iataCode}`,
      },
    ],
    relatedCitySlugs: input.relatedCitySlugs ?? [],
    faqs: input.faqs ?? [
      {
        id: `${input.citySlug}-flights`,
        question: `Can I book flights to ${input.cityName} from Pakistan?`,
        answer: `Yes. Search flights to ${input.cityName} (${input.iataCode}) from major Pakistan cities on GB International Travel. Live airline inventory depends on the configured flight supplier.`,
        category: "flights",
      },
      {
        id: `${input.citySlug}-weather`,
        question: `Is the weather on the ${input.cityName} page live?`,
        answer: `Not yet. Destination weather uses a clearly labeled sample provider until a licensed weather API is connected.`,
        category: "weather",
      },
      {
        id: `${input.citySlug}-visa`,
        question: `Does this page confirm my visa for ${input.cityName}?`,
        answer: `No. Visa information here is a placeholder reminder only. Always verify official entry requirements for your nationality.`,
        category: "travel",
      },
    ],
  };
};

export const destinationCities: DestinationCity[] = [
  city({
    citySlug: "karachi",
    cityName: "Karachi",
    countrySlug: "pakistan",
    countryName: "Pakistan",
    iataCode: "KHI",
    airportName: "Jinnah International Airport",
    isDomestic: true,
    summary:
      "Pakistan’s largest city and a primary domestic and international flight hub on the Arabian Sea.",
    bestFor: "Business travel, coastal getaways, and connecting domestic flights.",
    bestTimeToVisit: "November to February for milder coastal weather.",
    travelTips: [
      "Allow extra time for peak-hour airport transfers.",
      "Compare domestic and international connections through KHI.",
      "Keep passport and CNIC details ready for international legs.",
    ],
    popularRoutes: [
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → Karachi" },
      { fromIata: "LHE", fromCity: "Lahore", label: "Lahore → Karachi" },
    ],
    relatedCitySlugs: ["lahore", "islamabad", "dubai"],
    relatedFlightSearch: { from: "ISB", to: "KHI" },
  }),
  city({
    citySlug: "lahore",
    cityName: "Lahore",
    countrySlug: "pakistan",
    countryName: "Pakistan",
    iataCode: "LHE",
    airportName: "Allama Iqbal International Airport",
    isDomestic: true,
    summary:
      "Cultural capital of Punjab with strong domestic air links and popular routes to the Gulf.",
    bestFor: "Family travel, cultural trips, and Gulf connections.",
    bestTimeToVisit: "October to March for cooler sightseeing weather.",
    travelTips: [
      "Morning departures are often preferred for domestic hops.",
      "Check baggage allowance before selecting a fare family.",
    ],
    popularRoutes: [
      { fromIata: "KHI", fromCity: "Karachi", label: "Karachi → Lahore" },
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → Lahore" },
      { fromIata: "DXB", fromCity: "Dubai", label: "Dubai ↔ Lahore" },
    ],
    relatedCitySlugs: ["karachi", "islamabad", "dubai", "jeddah"],
    relatedFlightSearch: { from: "KHI", to: "LHE" },
  }),
  city({
    citySlug: "islamabad",
    cityName: "Islamabad",
    countrySlug: "pakistan",
    countryName: "Pakistan",
    iataCode: "ISB",
    airportName: "Islamabad International Airport",
    isDomestic: true,
    summary:
      "Capital city and gateway for northern Pakistan travel plus long-haul international routes.",
    bestFor: "Capital city visits and northern Pakistan trip starts.",
    bestTimeToVisit: "March to May and September to November for pleasant weather.",
    travelTips: [
      "ISB is a common origin for Dubai, Jeddah, and Istanbul searches.",
      "Plan hotel transfers in advance during peak seasons.",
    ],
    popularRoutes: [
      { fromIata: "LHE", fromCity: "Lahore", label: "Lahore → Islamabad" },
      { fromIata: "KHI", fromCity: "Karachi", label: "Karachi → Islamabad" },
      { fromIata: "DXB", fromCity: "Dubai", label: "Dubai ↔ Islamabad" },
    ],
    relatedCitySlugs: ["lahore", "karachi", "dubai", "istanbul"],
    relatedFlightSearch: { from: "LHE", to: "ISB" },
  }),
  city({
    citySlug: "dubai",
    cityName: "Dubai",
    countrySlug: "united-arab-emirates",
    countryName: "United Arab Emirates",
    iataCode: "DXB",
    airportName: "Dubai International Airport",
    isDomestic: false,
    summary:
      "One of the most searched international destinations from Pakistan for leisure, business, and transit.",
    bestFor: "Short breaks, shopping trips, and Gulf connections.",
    bestTimeToVisit: "November to March for cooler outdoor weather.",
    travelTips: [
      "Compare morning vs evening departures from ISB, LHE, and KHI.",
      "Check visa rules before booking.",
      "Review baggage and fare rules carefully for family travel.",
    ],
    popularRoutes: [
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → Dubai" },
      { fromIata: "LHE", fromCity: "Lahore", label: "Lahore → Dubai" },
      { fromIata: "KHI", fromCity: "Karachi", label: "Karachi → Dubai" },
    ],
    relatedCitySlugs: ["abu-dhabi", "doha", "islamabad", "lahore"],
    relatedFlightSearch: { from: "ISB", to: "DXB" },
  }),
  city({
    citySlug: "abu-dhabi",
    cityName: "Abu Dhabi",
    countrySlug: "united-arab-emirates",
    countryName: "United Arab Emirates",
    iataCode: "AUH",
    airportName: "Zayed International Airport",
    isDomestic: false,
    summary: "UAE capital and a frequent alternative to Dubai for Pakistan travelers.",
    bestFor: "Business and family travel to the UAE.",
    bestTimeToVisit: "November to March.",
    travelTips: ["Compare DXB vs AUH total trip time including transfers."],
    popularRoutes: [
      { fromIata: "LHE", fromCity: "Lahore", label: "Lahore → Abu Dhabi" },
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → Abu Dhabi" },
    ],
    relatedCitySlugs: ["dubai", "doha", "riyadh"],
    relatedFlightSearch: { from: "LHE", to: "AUH" },
  }),
  city({
    citySlug: "doha",
    cityName: "Doha",
    countrySlug: "qatar",
    countryName: "Qatar",
    iataCode: "DOH",
    airportName: "Hamad International Airport",
    isDomestic: false,
    summary: "Major Gulf hub popular for travel and transit from Pakistan.",
    bestFor: "Hub connections and short Gulf stays.",
    bestTimeToVisit: "November to March.",
    travelTips: ["Allow connection buffers when using DOH as a transit point."],
    popularRoutes: [
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → Doha" },
      { fromIata: "KHI", fromCity: "Karachi", label: "Karachi → Doha" },
    ],
    relatedCitySlugs: ["dubai", "abu-dhabi", "istanbul"],
    relatedFlightSearch: { from: "ISB", to: "DOH" },
  }),
  city({
    citySlug: "riyadh",
    cityName: "Riyadh",
    countrySlug: "saudi-arabia",
    countryName: "Saudi Arabia",
    iataCode: "RUH",
    airportName: "King Khalid International Airport",
    isDomestic: false,
    summary: "Saudi capital with strong demand for work and family travel from Pakistan.",
    bestFor: "Business and family visits to Saudi Arabia.",
    bestTimeToVisit: "November to February for cooler temperatures.",
    travelTips: ["Confirm visa/work documentation requirements before departure."],
    popularRoutes: [
      { fromIata: "KHI", fromCity: "Karachi", label: "Karachi → Riyadh" },
      { fromIata: "LHE", fromCity: "Lahore", label: "Lahore → Riyadh" },
    ],
    relatedCitySlugs: ["jeddah", "dubai", "doha"],
    relatedFlightSearch: { from: "KHI", to: "RUH" },
  }),
  city({
    citySlug: "jeddah",
    cityName: "Jeddah",
    countrySlug: "saudi-arabia",
    countryName: "Saudi Arabia",
    iataCode: "JED",
    airportName: "King Abdulaziz International Airport",
    isDomestic: false,
    summary: "Key western Saudi gateway frequently searched by Pakistan travelers.",
    bestFor: "Travel to western Saudi Arabia.",
    bestTimeToVisit: "November to February.",
    travelTips: ["Verify travel purpose documentation early in peak seasons."],
    popularRoutes: [
      { fromIata: "LHE", fromCity: "Lahore", label: "Lahore → Jeddah" },
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → Jeddah" },
      { fromIata: "KHI", fromCity: "Karachi", label: "Karachi → Jeddah" },
    ],
    relatedCitySlugs: ["riyadh", "dubai", "islamabad"],
    relatedFlightSearch: { from: "LHE", to: "JED" },
  }),
  city({
    citySlug: "istanbul",
    cityName: "Istanbul",
    countrySlug: "turkey",
    countryName: "Turkey",
    iataCode: "IST",
    airportName: "Istanbul Airport",
    isDomestic: false,
    summary: "Popular leisure and transit destination connecting Pakistan with Europe.",
    bestFor: "City breaks and Europe-bound connections.",
    bestTimeToVisit: "April to June and September to October.",
    travelTips: ["Compare IST schedules carefully for long layover options."],
    popularRoutes: [
      { fromIata: "LHE", fromCity: "Lahore", label: "Lahore → Istanbul" },
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → Istanbul" },
    ],
    relatedCitySlugs: ["london", "dubai", "doha"],
    relatedFlightSearch: { from: "LHE", to: "IST" },
  }),
  city({
    citySlug: "london",
    cityName: "London",
    countrySlug: "united-kingdom",
    countryName: "United Kingdom",
    iataCode: "LHR",
    airportName: "London Heathrow Airport",
    isDomestic: false,
    summary: "Major UK gateway for family, study, and business travel from Pakistan.",
    bestFor: "Long-haul travel to the United Kingdom.",
    bestTimeToVisit: "May to September for milder weather; check visa lead times year-round.",
    travelTips: [
      "Check visa lead times before selecting non-refundable fares.",
      "Compare one-stop vs multi-stop itineraries for total travel time.",
    ],
    popularRoutes: [
      { fromIata: "KHI", fromCity: "Karachi", label: "Karachi → London" },
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → London" },
    ],
    relatedCitySlugs: ["istanbul", "new-york", "toronto"],
    relatedFlightSearch: { from: "KHI", to: "LHR" },
  }),
  city({
    citySlug: "kuala-lumpur",
    cityName: "Kuala Lumpur",
    countrySlug: "malaysia",
    countryName: "Malaysia",
    iataCode: "KUL",
    airportName: "Kuala Lumpur International Airport",
    isDomestic: false,
    summary: "Southeast Asia hub popular for leisure and stopover travel.",
    bestFor: "Holiday travel and Asia connections.",
    bestTimeToVisit: "Dry-season windows vary by month; confirm local forecasts closer to travel.",
    travelTips: ["Review baggage rules for family leisure trips."],
    popularRoutes: [
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → Kuala Lumpur" },
      { fromIata: "LHE", fromCity: "Lahore", label: "Lahore → Kuala Lumpur" },
    ],
    relatedCitySlugs: ["bangkok", "singapore", "dubai"],
    relatedFlightSearch: { from: "ISB", to: "KUL" },
  }),
  city({
    citySlug: "bangkok",
    cityName: "Bangkok",
    countrySlug: "thailand",
    countryName: "Thailand",
    iataCode: "BKK",
    airportName: "Suvarnabhumi Airport",
    isDomestic: false,
    summary: "Popular leisure destination and Southeast Asia connection point.",
    bestFor: "Holiday travel.",
    bestTimeToVisit: "November to February is often preferred for cooler, drier conditions.",
    travelTips: ["Confirm entry requirements before booking."],
    popularRoutes: [
      { fromIata: "KHI", fromCity: "Karachi", label: "Karachi → Bangkok" },
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → Bangkok" },
    ],
    relatedCitySlugs: ["kuala-lumpur", "singapore", "dubai"],
    relatedFlightSearch: { from: "KHI", to: "BKK" },
  }),
  city({
    citySlug: "singapore",
    cityName: "Singapore",
    countrySlug: "singapore",
    countryName: "Singapore",
    iataCode: "SIN",
    airportName: "Singapore Changi Airport",
    isDomestic: false,
    summary: "Efficient hub city for business and leisure travelers from Pakistan.",
    bestFor: "Short city breaks and transit.",
    bestTimeToVisit: "Year-round tropical climate; plan around rainfall patterns.",
    travelTips: ["Plan airport transfer time for tight same-day connections."],
    popularRoutes: [
      { fromIata: "LHE", fromCity: "Lahore", label: "Lahore → Singapore" },
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → Singapore" },
    ],
    relatedCitySlugs: ["kuala-lumpur", "bangkok", "dubai"],
    relatedFlightSearch: { from: "LHE", to: "SIN" },
  }),
  city({
    citySlug: "new-york",
    cityName: "New York",
    countrySlug: "united-states",
    countryName: "United States",
    iataCode: "JFK",
    airportName: "John F. Kennedy International Airport",
    isDomestic: false,
    summary: "Primary US East Coast gateway for long-haul travel from Pakistan.",
    bestFor: "Family, study, and business travel to the USA.",
    bestTimeToVisit: "April to June and September to October for milder city weather.",
    travelTips: [
      "Visa processing time should guide when you lock non-flexible fares.",
      "Review layover cities carefully on long-haul itineraries.",
    ],
    popularRoutes: [
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → New York" },
      { fromIata: "LHE", fromCity: "Lahore", label: "Lahore → New York" },
    ],
    relatedCitySlugs: ["toronto", "london", "istanbul"],
    relatedFlightSearch: { from: "ISB", to: "JFK" },
  }),
  city({
    citySlug: "toronto",
    cityName: "Toronto",
    countrySlug: "canada",
    countryName: "Canada",
    iataCode: "YYZ",
    airportName: "Toronto Pearson International Airport",
    isDomestic: false,
    summary: "Major Canadian gateway for family and study travel from Pakistan.",
    bestFor: "Canada-bound family and study trips.",
    bestTimeToVisit: "May to September for milder weather.",
    travelTips: ["Confirm seasonal baggage and connection options early."],
    popularRoutes: [
      { fromIata: "LHE", fromCity: "Lahore", label: "Lahore → Toronto" },
      { fromIata: "ISB", fromCity: "Islamabad", label: "Islamabad → Toronto" },
    ],
    relatedCitySlugs: ["new-york", "london", "istanbul"],
    relatedFlightSearch: { from: "LHE", to: "YYZ" },
  }),
];

export const destinationCountries: DestinationCountry[] = [
  {
    countrySlug: "pakistan",
    countryName: "Pakistan",
    summary:
      "Domestic flight destinations across Pakistan, including major hubs and regional cities.",
    cities: ["karachi", "lahore", "islamabad"],
  },
  {
    countrySlug: "united-arab-emirates",
    countryName: "United Arab Emirates",
    summary: "Popular Gulf destinations from Pakistan, including Dubai and Abu Dhabi.",
    cities: ["dubai", "abu-dhabi"],
  },
  {
    countrySlug: "qatar",
    countryName: "Qatar",
    summary: "Doha and transit travel options from Pakistan.",
    cities: ["doha"],
  },
  {
    countrySlug: "saudi-arabia",
    countryName: "Saudi Arabia",
    summary: "Major Saudi destinations frequently searched from Pakistan.",
    cities: ["riyadh", "jeddah"],
  },
  {
    countrySlug: "turkey",
    countryName: "Turkey",
    summary: "Istanbul and connecting travel between Pakistan and Europe.",
    cities: ["istanbul"],
  },
  {
    countrySlug: "united-kingdom",
    countryName: "United Kingdom",
    summary: "UK gateway travel from Pakistan.",
    cities: ["london"],
  },
  {
    countrySlug: "malaysia",
    countryName: "Malaysia",
    summary: "Southeast Asia travel via Kuala Lumpur.",
    cities: ["kuala-lumpur"],
  },
  {
    countrySlug: "thailand",
    countryName: "Thailand",
    summary: "Leisure travel options including Bangkok.",
    cities: ["bangkok"],
  },
  {
    countrySlug: "singapore",
    countryName: "Singapore",
    summary: "Singapore city and hub travel from Pakistan.",
    cities: ["singapore"],
  },
  {
    countrySlug: "united-states",
    countryName: "United States",
    summary: "Long-haul US destinations from Pakistan.",
    cities: ["new-york"],
  },
  {
    countrySlug: "canada",
    countryName: "Canada",
    summary: "Canadian gateway travel from Pakistan.",
    cities: ["toronto"],
  },
];

export function toDestinationSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function destinationPath(countrySlug: string, citySlug?: string): string {
  if (!citySlug) return `/destinations/${countrySlug}`;
  return `/destinations/${countrySlug}/${citySlug}`;
}

export function getCountryBySlug(slug: string) {
  return destinationCountries.find((c) => c.countrySlug === slug) ?? null;
}

export function getCityBySlugs(countrySlug: string, citySlug: string) {
  return (
    destinationCities.find(
      (c) => c.countrySlug === countrySlug && c.citySlug === citySlug,
    ) ?? null
  );
}

export function getCityByCitySlug(citySlug: string) {
  return destinationCities.find((c) => c.citySlug === citySlug) ?? null;
}

export function getCitiesForCountry(countrySlug: string) {
  return destinationCities.filter((c) => c.countrySlug === countrySlug);
}

export function getCityByIata(iata: string) {
  return destinationCities.find((c) => c.iataCode === iata.toUpperCase()) ?? null;
}

export function getRelatedCities(city: DestinationCity) {
  return city.relatedCitySlugs
    .map((slug) => getCityByCitySlug(slug))
    .filter((item): item is DestinationCity => Boolean(item));
}

export function listAllDestinationPaths() {
  const paths: string[] = ["/destinations"];
  for (const country of destinationCountries) {
    paths.push(`/destinations/${country.countrySlug}`);
    for (const citySlug of country.cities) {
      paths.push(`/destinations/${country.countrySlug}/${citySlug}`);
    }
  }
  return paths;
}

export function listCityDestinationPaths() {
  return destinationCities.map((c) => destinationPath(c.countrySlug, c.citySlug));
}

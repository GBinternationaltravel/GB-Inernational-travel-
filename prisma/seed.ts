import { PrismaClient, type TourDestination, type TourSeason } from "@prisma/client";
import { hash } from "bcryptjs";

/**
 * Development seed only.
 * Demo passwords come from DEMO_CUSTOMER_PASSWORD / DEMO_ADMIN_PASSWORD env vars.
 * Never hard-code production credentials.
 */

const prisma = new PrismaClient();

const sampleTours: Array<{
  name: string;
  slug: string;
  destination: TourDestination;
  season: TourSeason;
  durationDays: number;
  price: number;
  description: string;
  highlights: string[];
  itinerary: string[];
}> = [
  {
    name: "Hunza Valley Sample Package",
    slug: "hunza-valley-sample-package",
    destination: "HUNZA",
    season: "SPRING",
    durationDays: 6,
    price: 95000,
    description:
      "Sample package for Hunza valley sightseeing. Inquiry-based — not live inventory.",
    highlights: ["Karimabad", "Attabad Lake", "Passu cones viewpoint"],
    itinerary: ["Day 1: Arrive Gilgit / transfer to Hunza", "Day 2–5: Local sightseeing", "Day 6: Return"],
  },
  {
    name: "Skardu Lakes Sample Package",
    slug: "skardu-lakes-sample-package",
    destination: "SKARDU",
    season: "SUMMER",
    durationDays: 7,
    price: 110000,
    description: "Sample Skardu package covering Shangrila and Upper Kachura highlights.",
    highlights: ["Shangrila Resort area", "Upper Kachura", "Skardu fort viewpoints"],
    itinerary: ["Day 1: Arrive Skardu", "Day 2–6: Lakes & valleys", "Day 7: Departure"],
  },
  {
    name: "Gilgit City & Valleys Sample",
    slug: "gilgit-city-valleys-sample",
    destination: "GILGIT",
    season: "AUTUMN",
    durationDays: 4,
    price: 65000,
    description: "Short sample stay centered on Gilgit as a hub for northern valleys.",
    highlights: ["Gilgit bazaar", "Kargah Buddha", "Day trips by request"],
    itinerary: ["Day 1: Arrival", "Day 2–3: Local excursions", "Day 4: Departure"],
  },
  {
    name: "Naltar Valley Sample Package",
    slug: "naltar-valley-sample-package",
    destination: "NALTAR",
    season: "SUMMER",
    durationDays: 3,
    price: 55000,
    description: "Sample Naltar lakes package for summer travel inquiries.",
    highlights: ["Naltar lakes", "Pine forests", "Local jeep transfer note"],
    itinerary: ["Day 1: Transfer to Naltar", "Day 2: Lakes", "Day 3: Return"],
  },
  {
    name: "Khunjerab Pass Sample Day Trip",
    slug: "khunjerab-pass-sample",
    destination: "KHUNJERAB",
    season: "SUMMER",
    durationDays: 2,
    price: 48000,
    description:
      "Sample Khunjerab / China border viewpoint package. Road/weather dependent — inquiry only.",
    highlights: ["Karakoram Highway", "Khunjerab Pass viewpoint", "Sost stop"],
    itinerary: ["Day 1: Toward Khunjerab", "Day 2: Return via Hunza"],
  },
  {
    name: "Fairy Meadows Sample Trek Package",
    slug: "fairy-meadows-sample-package",
    destination: "FAIRY_MEADOWS",
    season: "SUMMER",
    durationDays: 5,
    price: 85000,
    description: "Sample Fairy Meadows trek-oriented package (fitness and season dependent).",
    highlights: ["Raikot Bridge jeep", "Fairy Meadows meadows", "Nanga Parbat viewpoints"],
    itinerary: ["Day 1: Transfer", "Day 2–4: Meadows stay", "Day 5: Return"],
  },
  {
    name: "Deosai Plains Sample Package",
    slug: "deosai-plains-sample-package",
    destination: "DEOSAI",
    season: "SUMMER",
    durationDays: 4,
    price: 78000,
    description: "Sample Deosai plains package. Open season only — confirm before travel.",
    highlights: ["Deosai National Park", "Sheosar Lake", "High-altitude plains"],
    itinerary: ["Day 1: Toward Deosai", "Day 2–3: Plains exploration", "Day 4: Return"],
  },
];

async function seedTours() {
  for (const tour of sampleTours) {
    await prisma.tourPackage.upsert({
      where: { slug: tour.slug },
      update: {
        name: tour.name,
        destination: tour.destination,
        season: tour.season,
        durationDays: tour.durationDays,
        price: tour.price,
        currency: "PKR",
        description: tour.description,
        highlights: tour.highlights,
        itinerary: tour.itinerary,
        hotel: "Sample twin-sharing lodging (confirm on inquiry)",
        transport: "Private vehicle / jeep as required (sample)",
        meals: "Breakfast included (sample)",
        included: "Transport as listed, hotel nights, basic guiding (sample)",
        excluded: "Flights, personal expenses, entry fees not listed",
        availabilityNote:
          "Sample package for inquiries only. Dates and rates confirmed after request.",
        status: "PUBLISHED",
      },
      create: {
        name: tour.name,
        slug: tour.slug,
        destination: tour.destination,
        season: tour.season,
        durationDays: tour.durationDays,
        price: tour.price,
        currency: "PKR",
        description: tour.description,
        highlights: tour.highlights,
        itinerary: tour.itinerary,
        hotel: "Sample twin-sharing lodging (confirm on inquiry)",
        transport: "Private vehicle / jeep as required (sample)",
        meals: "Breakfast included (sample)",
        included: "Transport as listed, hotel nights, basic guiding (sample)",
        excluded: "Flights, personal expenses, entry fees not listed",
        availabilityNote:
          "Sample package for inquiries only. Dates and rates confirmed after request.",
        status: "PUBLISHED",
      },
    });
  }
  console.log(`Seeded ${sampleTours.length} sample tour packages (PUBLISHED).`);
}

async function seedVisaGuides() {
  const guides = [
    {
      destinationKey: "UAE_DUBAI" as const,
      countryName: "United Arab Emirates",
      cityName: "Dubai",
      slug: "uae-dubai-visa",
      visaType: "Tourist visa (informational)",
      eligibility: "Varies by nationality and passport type. Confirm with official UAE channels.",
      requiredDocuments:
        "Typically passport validity, photos, application form, and supporting travel docs — verify officially.",
      processingInfo: "Processing times vary by channel and nationality.",
      duration: "Depends on visa category issued.",
      feesNote: "Fees change; check official sources.",
      importantNotes: "This page is informational only and not legal advice.",
      officialSourceUrl: "https://u.ae/en/information-and-services/visa-and-emirates-id",
    },
    {
      destinationKey: "TURKEY" as const,
      countryName: "Turkey",
      cityName: null,
      slug: "turkey-visa",
      visaType: "e-Visa / sticker visa (informational)",
      eligibility: "Depends on passport and purpose of travel.",
      requiredDocuments: "Passport, photos, application — verify on official portals.",
      processingInfo: "e-Visa and consular routes differ; confirm before travel.",
      duration: "As printed on the visa / e-Visa.",
      feesNote: "Official fee schedules apply.",
      importantNotes: "Always verify on the Republic of Türkiye official visa sites.",
      officialSourceUrl: "https://www.mfa.gov.tr/visa-information-for-foreigners.en.mfa",
    },
    {
      destinationKey: "THAILAND" as const,
      countryName: "Thailand",
      cityName: null,
      slug: "thailand-visa",
      visaType: "Tourist / exemption categories (informational)",
      eligibility: "Rules differ by nationality and stay length.",
      requiredDocuments: "Passport, onward travel, funds proof as required — verify officially.",
      processingInfo: "Embassy / exemption / e-services may apply depending on nationality.",
      duration: "As granted on entry or visa sticker.",
      feesNote: "Confirm current fees with Thai authorities.",
      importantNotes: "Overstay penalties are strict — verify before travel.",
      officialSourceUrl: "https://www.thaiembassy.com/",
    },
    {
      destinationKey: "SINGAPORE" as const,
      countryName: "Singapore",
      cityName: null,
      slug: "singapore-visa",
      visaType: "Visa required / exempt (informational)",
      eligibility: "Check ICA guidance for your nationality.",
      requiredDocuments: "Passport, forms, and supporting docs as listed by ICA.",
      processingInfo: "Apply only through official ICA / authorized channels.",
      duration: "As endorsed on arrival / visa.",
      feesNote: "Official ICA fee schedule applies.",
      importantNotes: "Do not rely on third-party summaries alone.",
      officialSourceUrl: "https://www.ica.gov.sg/",
    },
  ];

  for (const guide of guides) {
    await prisma.visaGuide.upsert({
      where: { destinationKey: guide.destinationKey },
      update: {
        ...guide,
        isPublished: true,
        lastUpdatedAt: new Date(),
        seoTitle: `${guide.countryName} visa information`,
        seoDescription: `Informational ${guide.countryName} visa guidance. Verify with official authorities.`,
      },
      create: {
        ...guide,
        isPublished: true,
        lastUpdatedAt: new Date(),
        seoTitle: `${guide.countryName} visa information`,
        seoDescription: `Informational ${guide.countryName} visa guidance. Verify with official authorities.`,
      },
    });
  }
  console.log(`Seeded ${guides.length} visa guides (PUBLISHED).`);
}

async function main() {
  const customerPassword =
    process.env.DEMO_CUSTOMER_PASSWORD ?? "DemoCustomer!234";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "DemoAdmin!234";

  const customerHash = await hash(customerPassword, 12);
  const adminHash = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: "demo.customer@example.com" },
    update: {
      passwordHash: customerHash,
      firstName: "Demo",
      lastName: "Customer",
      phone: "3001234567",
      phoneCountryCode: "+92",
      role: "CUSTOMER",
      isDemo: true,
    },
    create: {
      email: "demo.customer@example.com",
      passwordHash: customerHash,
      firstName: "Demo",
      lastName: "Customer",
      phone: "3001234567",
      phoneCountryCode: "+92",
      role: "CUSTOMER",
      isDemo: true,
      preferredCurrency: "PKR",
      preferredLanguage: "en",
    },
  });

  await prisma.user.upsert({
    where: { email: "demo.admin@example.com" },
    update: {
      passwordHash: adminHash,
      firstName: "Demo",
      lastName: "Admin",
      phone: "3007654321",
      phoneCountryCode: "+92",
      role: "ADMIN",
      isDemo: true,
    },
    create: {
      email: "demo.admin@example.com",
      passwordHash: adminHash,
      firstName: "Demo",
      lastName: "Admin",
      phone: "3007654321",
      phoneCountryCode: "+92",
      role: "ADMIN",
      isDemo: true,
      preferredCurrency: "PKR",
      preferredLanguage: "en",
    },
  });

  console.log("Seeded demo customer and admin users (isDemo=true).");
  console.log("Use DEMO_CUSTOMER_PASSWORD / DEMO_ADMIN_PASSWORD env vars to override defaults.");

  await seedStaffRoles(adminHash);
  await seedAirlines();
  await seedAirports();
  await seedFaqs();
  await seedTravelUpdates();
  await seedDestinationsAndGuides();
  await seedDeals();
  await seedTours();
  await seedVisaGuides();
}

async function seedStaffRoles(passwordHash: string) {
  const staff = [
    { email: "demo.superadmin@example.com", role: "SUPER_ADMIN" as const, firstName: "Super", lastName: "Admin" },
    { email: "demo.manager@example.com", role: "MANAGER" as const, firstName: "Demo", lastName: "Manager" },
    { email: "demo.issuer@example.com", role: "TICKET_ISSUER" as const, firstName: "Demo", lastName: "Issuer" },
    { email: "demo.accountant@example.com", role: "ACCOUNTANT" as const, firstName: "Demo", lastName: "Accountant" },
  ];
  for (const user of staff) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isDemo: true,
        isActive: true,
      },
      create: {
        email: user.email,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isDemo: true,
        preferredCurrency: "PKR",
        preferredLanguage: "en",
      },
    });
  }
  console.log(`Seeded ${staff.length} staff role demo users (password = DEMO_ADMIN_PASSWORD).`);
}

async function seedAirlines() {
  const rows = [
    { iataCode: "PK", name: "Pakistan International Airlines", countryCode: "PK" },
    { iataCode: "ER", name: "Fly Jinnah", countryCode: "PK" },
    { iataCode: "PA", name: "airblue", countryCode: "PK" },
    { iataCode: "EK", name: "Emirates", countryCode: "AE" },
    { iataCode: "EY", name: "Etihad Airways", countryCode: "AE" },
    { iataCode: "QR", name: "Qatar Airways", countryCode: "QA" },
    { iataCode: "SV", name: "Saudia", countryCode: "SA" },
    { iataCode: "TK", name: "Turkish Airlines", countryCode: "TR" },
  ];
  for (const row of rows) {
    const slug = `${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${row.iataCode.toLowerCase()}`;
    await prisma.airline.upsert({
      where: { iataCode: row.iataCode },
      update: { name: row.name, countryCode: row.countryCode, isActive: true },
      create: {
        iataCode: row.iataCode,
        name: row.name,
        slug,
        countryCode: row.countryCode,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${rows.length} airlines (upsert by IATA).`);
}

async function ensureCity(input: {
  countryCode: string;
  countryName: string;
  cityName: string;
  citySlug: string;
  timezone?: string;
}) {
  const country = await prisma.country.upsert({
    where: { code: input.countryCode },
    update: { name: input.countryName },
    create: { code: input.countryCode, name: input.countryName },
  });
  const existing = await prisma.city.findFirst({
    where: { countryId: country.id, name: { equals: input.cityName, mode: "insensitive" } },
  });
  if (existing) return existing;
  return prisma.city.create({
    data: {
      countryId: country.id,
      name: input.cityName,
      slug: input.citySlug,
      timezone: input.timezone,
    },
  });
}

async function seedAirports() {
  const rows = [
    { iata: "ISB", icao: "OPIS", name: "Islamabad International Airport", city: "Islamabad", countryCode: "PK", country: "Pakistan", tz: "Asia/Karachi" },
    { iata: "LHE", icao: "OPLA", name: "Allama Iqbal International Airport", city: "Lahore", countryCode: "PK", country: "Pakistan", tz: "Asia/Karachi" },
    { iata: "KHI", icao: "OPKC", name: "Jinnah International Airport", city: "Karachi", countryCode: "PK", country: "Pakistan", tz: "Asia/Karachi" },
    { iata: "GIL", icao: "OPGT", name: "Gilgit Airport", city: "Gilgit", countryCode: "PK", country: "Pakistan", tz: "Asia/Karachi" },
    { iata: "KDU", icao: "OPSD", name: "Skardu Airport", city: "Skardu", countryCode: "PK", country: "Pakistan", tz: "Asia/Karachi" },
    { iata: "DXB", icao: "OMDB", name: "Dubai International Airport", city: "Dubai", countryCode: "AE", country: "United Arab Emirates", tz: "Asia/Dubai" },
    { iata: "IST", icao: "LTFM", name: "Istanbul Airport", city: "Istanbul", countryCode: "TR", country: "Turkey", tz: "Europe/Istanbul" },
    { iata: "JED", icao: "OEJN", name: "King Abdulaziz International Airport", city: "Jeddah", countryCode: "SA", country: "Saudi Arabia", tz: "Asia/Riyadh" },
  ];
  for (const row of rows) {
    const city = await ensureCity({
      countryCode: row.countryCode,
      countryName: row.country,
      cityName: row.city,
      citySlug: row.city.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      timezone: row.tz,
    });
    await prisma.airport.upsert({
      where: { iataCode: row.iata },
      update: {
        name: row.name,
        icaoCode: row.icao,
        cityId: city.id,
        timezone: row.tz,
        isActive: true,
      },
      create: {
        iataCode: row.iata,
        icaoCode: row.icao,
        name: row.name,
        slug: `${row.iata.toLowerCase()}-${row.city.toLowerCase()}`,
        cityId: city.id,
        timezone: row.tz,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${rows.length} airports (upsert by IATA).`);
}

async function seedFaqs() {
  const faqs = [
    {
      question: "What can I do on GB International Travel today?",
      answer:
        "Search mock flights, complete a booking draft, pay with the mock payment provider, and receive ticket confirmation after manual issuance by our ticket desk.",
      category: "general",
      sortOrder: 1,
    },
    {
      question: "Are the flight prices on this site live airline fares?",
      answer:
        "Mock and sandbox results are clearly labeled. Live Travelport inventory requires configured supplier credentials. Agency markup is applied server-side on the supplier fare.",
      category: "flights",
      sortOrder: 2,
    },
    {
      question: "Which currency will bookings use?",
      answer: "The primary market currency is Pakistani Rupee (PKR).",
      category: "payments",
      sortOrder: 3,
    },
    {
      question: "How is agency markup calculated?",
      answer:
        "On supplier fare: 5% for amounts up to PKR 50,000 and 3.5% above PKR 50,000. Markup is calculated once on the server and never compounded on refresh.",
      category: "payments",
      sortOrder: 4,
    },
    {
      question: "When do I receive my ticket?",
      answer:
        "After payment verification, bookings enter ticketing pending. A ticket issuer records the PNR/ticket reference in MANUAL, SANDBOX, or MOCK mode before confirmation email is sent.",
      category: "ticketing",
      sortOrder: 5,
    },
  ];
  for (const faq of faqs) {
    const existing = await prisma.fAQ.findFirst({ where: { question: faq.question } });
    if (existing) {
      await prisma.fAQ.update({
        where: { id: existing.id },
        data: { ...faq, isPublished: true },
      });
    } else {
      await prisma.fAQ.create({ data: { ...faq, isPublished: true } });
    }
  }
  console.log(`Seeded ${faqs.length} FAQs (idempotent by question).`);
}

async function seedTravelUpdates() {
  const updates = [
    {
      slug: "kkh-seasonal-advisory",
      type: "ADVISORY" as const,
      title: "Karakoram Highway seasonal advisory",
      summary: "Sample staging advisory for northern road travel.",
      body: "This is a sample travel advisory for staging. Always verify road status with local authorities before travel.",
      priority: "NORMAL" as const,
      region: "Gilgit-Baltistan",
    },
    {
      slug: "gilgit-weather-update-sample",
      type: "WEATHER" as const,
      title: "Gilgit weather sample update",
      summary: "Sample weather bulletin for CMS testing.",
      body: "Sample weather update content for staging. Not a live meteorological forecast.",
      priority: "LOW" as const,
      region: "Gilgit",
    },
    {
      slug: "skardu-flight-ops-sample",
      type: "FLIGHT" as const,
      title: "Skardu flight operations sample note",
      summary: "Sample flight operations note.",
      body: "Sample flight operations content. Confirm schedules with the operating airline.",
      priority: "HIGH" as const,
      region: "Skardu",
    },
  ];
  for (const row of updates) {
    await prisma.travelUpdate.upsert({
      where: { slug: row.slug },
      update: {
        ...row,
        isPublished: true,
        publishedAt: new Date(),
      },
      create: {
        ...row,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }
  console.log(`Seeded ${updates.length} travel updates.`);
}

async function seedDestinationsAndGuides() {
  const destinations = [
    {
      slug: "dubai",
      title: "Dubai",
      city: "Dubai",
      countryCode: "AE",
      country: "United Arab Emirates",
      airportCode: "DXB",
      summary: "Popular international destination from Pakistan.",
      description: "Staging destination page for Dubai travel content.",
      travelInfo: "Direct and one-stop options from major Pakistani cities (sample).",
      visaInfo: "Visa rules vary by nationality — verify with official UAE sources.",
      weatherInfo: "Hot summers; check mock/live weather widget for samples.",
    },
    {
      slug: "istanbul",
      title: "Istanbul",
      city: "Istanbul",
      countryCode: "TR",
      country: "Turkey",
      airportCode: "IST",
      summary: "Connecting hub between Pakistan and Europe.",
      description: "Staging destination page for Istanbul.",
      travelInfo: "Common stopover city on long-haul routings (sample).",
      visaInfo: "Confirm Turkish visa requirements with official MFA sources.",
      weatherInfo: "Seasonal variation — use weather provider when configured.",
    },
    {
      slug: "gilgit",
      title: "Gilgit",
      city: "Gilgit",
      countryCode: "PK",
      country: "Pakistan",
      airportCode: "GIL",
      summary: "Gateway city for Gilgit-Baltistan tourism.",
      description: "Staging destination for Gilgit and northern valleys.",
      travelInfo: "Air and road access vary by season.",
      visaInfo: "Domestic destination for Pakistani travelers.",
      weatherInfo: "Mountain weather changes quickly.",
    },
  ];

  for (const dest of destinations) {
    const city = await ensureCity({
      countryCode: dest.countryCode,
      countryName: dest.country,
      cityName: dest.city,
      citySlug: dest.slug,
    });
    const record = await prisma.destination.upsert({
      where: { slug: dest.slug },
      update: {
        title: dest.title,
        cityId: city.id,
        summary: dest.summary,
        description: dest.description,
        travelInfo: dest.travelInfo,
        visaInfo: dest.visaInfo,
        weatherInfo: dest.weatherInfo,
        airportCode: dest.airportCode,
        seoTitle: `${dest.title} travel guide`,
        seoDescription: dest.summary,
        published: true,
        isFeatured: true,
      },
      create: {
        slug: dest.slug,
        title: dest.title,
        cityId: city.id,
        summary: dest.summary,
        description: dest.description,
        travelInfo: dest.travelInfo,
        visaInfo: dest.visaInfo,
        weatherInfo: dest.weatherInfo,
        airportCode: dest.airportCode,
        seoTitle: `${dest.title} travel guide`,
        seoDescription: dest.summary,
        published: true,
        isFeatured: true,
      },
    });

    await prisma.travelGuide.upsert({
      where: { slug: `${dest.slug}-essentials` },
      update: {
        title: `${dest.title} travel essentials`,
        destinationId: record.id,
        content: `Staging travel guide for ${dest.title}. Content is informational and should be reviewed before publishing publicly.`,
        status: "PUBLISHED",
        publishedAt: new Date(),
        seoTitle: `${dest.title} essentials`,
        seoDescription: `Travel essentials for ${dest.title}`,
      },
      create: {
        slug: `${dest.slug}-essentials`,
        title: `${dest.title} travel essentials`,
        destinationId: record.id,
        content: `Staging travel guide for ${dest.title}. Content is informational and should be reviewed before publishing publicly.`,
        status: "PUBLISHED",
        publishedAt: new Date(),
        seoTitle: `${dest.title} essentials`,
        seoDescription: `Travel essentials for ${dest.title}`,
      },
    });
  }
  console.log(`Seeded ${destinations.length} destinations + travel guides.`);
}

async function seedDeals() {
  const deals = [
    {
      slug: "khi-dxb-sample-deal",
      title: "Karachi to Dubai sample fare card",
      airlineCode: "PK",
      airlineName: "Pakistan International Airlines",
      originCode: "KHI",
      destinationCode: "DXB",
      price: 45000,
      description: "Sample marketing deal for staging. Not a live inventory guarantee.",
    },
    {
      slug: "lhe-ist-sample-deal",
      title: "Lahore to Istanbul sample fare card",
      airlineCode: "TK",
      airlineName: "Turkish Airlines",
      originCode: "LHE",
      destinationCode: "IST",
      price: 78000,
      description: "Sample marketing deal above PKR 50,000 band for markup demos.",
    },
  ];
  for (const deal of deals) {
    await prisma.deal.upsert({
      where: { slug: deal.slug },
      update: { ...deal, currency: "PKR", isPublished: true },
      create: { ...deal, currency: "PKR", isPublished: true },
    });
  }
  console.log(`Seeded ${deals.length} deals.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

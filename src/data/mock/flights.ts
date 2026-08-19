import type {
  CabinClass,
  FlightOffer,
  FlightSearchParams,
} from "@/types/flight";
import { airlines, getAirlineById } from "@/data/airlines";
import { getAirportByCode } from "@/data/airports";

type RouteSeed = {
  origin: string;
  destination: string;
  baseDurationMinutes: number;
  basePrice: number;
  airlineIds: string[];
};

/**
 * Primary mock routes used for development search results.
 * Prices and times are placeholder demo values — not live fares.
 */
const routeSeeds: RouteSeed[] = [
  { origin: "ISB", destination: "DXB", baseDurationMinutes: 225, basePrice: 74500, airlineIds: ["ek", "pk", "er", "pa"] },
  { origin: "LHE", destination: "DXB", baseDurationMinutes: 210, basePrice: 72000, airlineIds: ["ek", "pk", "er"] },
  { origin: "KHI", destination: "DXB", baseDurationMinutes: 165, basePrice: 68500, airlineIds: ["ek", "pk", "pa"] },
  { origin: "ISB", destination: "JED", baseDurationMinutes: 330, basePrice: 118000, airlineIds: ["sv", "pk", "er"] },
  { origin: "LHE", destination: "JED", baseDurationMinutes: 340, basePrice: 121000, airlineIds: ["sv", "pk"] },
  { origin: "KHI", destination: "RUH", baseDurationMinutes: 240, basePrice: 98000, airlineIds: ["sv", "pk", "pa"] },
  { origin: "ISB", destination: "DOH", baseDurationMinutes: 210, basePrice: 89000, airlineIds: ["qr", "pk"] },
  { origin: "LHE", destination: "IST", baseDurationMinutes: 360, basePrice: 145000, airlineIds: ["tk", "pk"] },
  { origin: "KHI", destination: "LHR", baseDurationMinutes: 480, basePrice: 210000, airlineIds: ["ba", "pk", "ek"] },
  { origin: "ISB", destination: "KUL", baseDurationMinutes: 390, basePrice: 132000, airlineIds: ["mh", "pk"] },
  // Domestic samples
  { origin: "LHE", destination: "ISB", baseDurationMinutes: 65, basePrice: 22000, airlineIds: ["pk", "er", "pa"] },
  { origin: "KHI", destination: "ISB", baseDurationMinutes: 110, basePrice: 28000, airlineIds: ["pk", "er", "pa"] },
  { origin: "KHI", destination: "LHE", baseDurationMinutes: 105, basePrice: 26000, airlineIds: ["pk", "er", "pa"] },
];

const cabinMultipliers: Record<CabinClass, number> = {
  ECONOMY: 1,
  PREMIUM_ECONOMY: 1.45,
  BUSINESS: 2.4,
  FIRST: 3.4,
};

const departureHours = [6, 8, 11, 14, 17, 20, 23];

function addMinutes(isoDate: string, hour: number, minute: number, addMins: number): string {
  const date = new Date(`${isoDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:00`);
  date.setMinutes(date.getMinutes() + addMins);
  return date.toISOString();
}

function buildOffer(options: {
  route: RouteSeed;
  airlineId: string;
  departureDate: string;
  hour: number;
  index: number;
  cabinClass: CabinClass;
  tripType: FlightSearchParams["tripType"];
  stops: number;
}): FlightOffer | null {
  const origin = getAirportByCode(options.route.origin);
  const destination = getAirportByCode(options.route.destination);
  const airline = getAirlineById(options.airlineId);
  if (!origin || !destination || !airline) return null;

  const stopPenalty = options.stops * 95;
  const durationMinutes = options.route.baseDurationMinutes + stopPenalty;
  const priceVariance = (options.index % 5) * 2500 + options.hour * 180;
  const totalPrice = Math.round(
    (options.route.basePrice + priceVariance + options.stops * 4500) *
      cabinMultipliers[options.cabinClass],
  );

  const departureAt = addMinutes(options.departureDate, options.hour, (options.index * 7) % 50, 0);
  const arrivalAt = addMinutes(
    options.departureDate,
    options.hour,
    (options.index * 7) % 50,
    durationMinutes,
  );

  const flightNumber = `${airline.iataCode}${600 + options.index * 3 + options.hour}`;
  const baggageKg =
    options.cabinClass === "ECONOMY"
      ? options.stops === 0
        ? 30
        : 23
      : options.cabinClass === "PREMIUM_ECONOMY"
        ? 35
        : 40;

  const segments =
    options.stops === 0
      ? [
          {
            origin,
            destination,
            departureAt,
            arrivalAt,
            durationMinutes,
            flightNumber,
            airline: { iataCode: airline.iataCode, name: airline.name },
          },
        ]
      : buildConnectingSegments({
          origin,
          destination,
          airline,
          flightNumber,
          departureAt,
          durationMinutes,
          stops: options.stops,
        });

  return {
    id: `mock-${options.route.origin}-${options.route.destination}-${airline.id}-${options.hour}-${options.index}-${options.cabinClass}`.toLowerCase(),
    providerCode: "MOCK",
    supplierCode: "MOCK",
    supplierOfferId: `sup-mock-${options.route.origin}${options.route.destination}-${airline.iataCode}-${options.hour}${options.index}`,
    supplierSessionRef: `mock-session-${options.departureDate}`,
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    isMock: true,
    airlineId: airline.id,
    tripType: options.tripType,
    cabinClass: options.cabinClass,
    currency: "PKR",
    totalPrice,
    segments,
    stops: options.stops,
    durationMinutes,
    baggageKg,
    baggageIncluded: true,
    seatsRemaining: 2 + ((options.index + options.hour) % 7),
    refundable: options.cabinClass !== "ECONOMY" || options.index % 3 === 0,
    marketingCarrier: { iataCode: airline.iataCode, name: airline.name },
    operatingCarrier: { iataCode: airline.iataCode, name: airline.name },
    fareFamily: options.cabinClass === "ECONOMY" ? "Mock Economy" : `Mock ${options.cabinClass}`,
    baseFare: Math.round(totalPrice * 0.88),
    taxes: Math.round(totalPrice * 0.12),
    fees: 0,
    changeable: options.cabinClass !== "ECONOMY",
    fareRules: "Mock fare rules — not a real airline contract of carriage.",
  };
}

function buildConnectingSegments({
  origin,
  destination,
  airline,
  flightNumber,
  departureAt,
  durationMinutes,
  stops,
}: {
  origin: NonNullable<ReturnType<typeof getAirportByCode>>;
  destination: NonNullable<ReturnType<typeof getAirportByCode>>;
  airline: NonNullable<ReturnType<typeof getAirlineById>>;
  flightNumber: string;
  departureAt: string;
  durationMinutes: number;
  stops: number;
}) {
  const hub = getAirportByCode(stops >= 2 ? "DOH" : "DXB") ?? destination;
  const firstLeg = Math.round(durationMinutes * 0.45);
  const secondLeg = durationMinutes - firstLeg;
  const midDeparture = new Date(departureAt);
  midDeparture.setMinutes(midDeparture.getMinutes() + firstLeg + 55);
  const finalArrival = new Date(departureAt);
  finalArrival.setMinutes(finalArrival.getMinutes() + durationMinutes);

  return [
    {
      origin,
      destination: hub,
      departureAt,
      arrivalAt: new Date(new Date(departureAt).getTime() + firstLeg * 60_000).toISOString(),
      durationMinutes: firstLeg,
      flightNumber,
      airline: { iataCode: airline.iataCode, name: airline.name },
    },
    {
      origin: hub,
      destination,
      departureAt: midDeparture.toISOString(),
      arrivalAt: finalArrival.toISOString(),
      durationMinutes: secondLeg,
      flightNumber: `${airline.iataCode}${Number(flightNumber.replace(/\D/g, "")) + 1}`,
      airline: { iataCode: airline.iataCode, name: airline.name },
    },
  ];
}

/** Generate labeled mock offers for a search. Not live airline inventory. */
export function generateMockOffers(params: FlightSearchParams): FlightOffer[] {
  const seed = routeSeeds.find(
    (route) =>
      route.origin === params.origin.toUpperCase() &&
      route.destination === params.destination.toUpperCase(),
  );

  if (!seed) {
    return [];
  }

  const offers: FlightOffer[] = [];
  let index = 0;

  for (const airlineId of seed.airlineIds) {
    for (const hour of departureHours) {
      const stopOptions = hour % 5 === 0 ? [1] : hour % 7 === 0 ? [2] : [0];
      for (const stops of stopOptions) {
        const offer = buildOffer({
          route: seed,
          airlineId,
          departureDate: params.departureDate,
          hour,
          index,
          cabinClass: params.cabinClass,
          tripType: params.tripType,
          stops,
        });
        if (offer) offers.push(offer);
        index += 1;
      }
    }
  }

  // Ensure a few connecting options exist for filter demos
  if (offers.every((offer) => offer.stops === 0) && seed.airlineIds[0]) {
    const connecting = buildOffer({
      route: seed,
      airlineId: seed.airlineIds[0],
      departureDate: params.departureDate,
      hour: 9,
      index: 99,
      cabinClass: params.cabinClass,
      tripType: params.tripType,
      stops: 1,
    });
    if (connecting) offers.push(connecting);
  }

  return offers;
}

export function getMockOfferById(
  id: string,
  params?: Partial<FlightSearchParams>,
): FlightOffer | null {
  const fallbackParams: FlightSearchParams = {
    tripType: params?.tripType ?? "ONE_WAY",
    origin: params?.origin ?? "ISB",
    destination: params?.destination ?? "DXB",
    departureDate: params?.departureDate ?? "2026-09-12",
    returnDate: params?.returnDate,
    adults: params?.adults ?? 1,
    children: params?.children ?? 0,
    infants: params?.infants ?? 0,
    cabinClass: params?.cabinClass ?? "ECONOMY",
    currency: params?.currency ?? "PKR",
  };

  // Try matching against all seeded routes for this id
  for (const route of routeSeeds) {
    const offers = generateMockOffers({
      ...fallbackParams,
      origin: route.origin,
      destination: route.destination,
    });
    const found = offers.find((offer) => offer.id === id);
    if (found) return found;
  }

  return null;
}

export function listMockAirlinesForRoute(origin: string, destination: string) {
  const seed = routeSeeds.find(
    (route) =>
      route.origin === origin.toUpperCase() &&
      route.destination === destination.toUpperCase(),
  );
  if (!seed) return airlines;
  return seed.airlineIds
    .map((id) => getAirlineById(id))
    .filter((airline): airline is NonNullable<typeof airline> => Boolean(airline));
}

export const mockRouteList = routeSeeds.map(
  (route) => `${route.origin} → ${route.destination}`,
);

/** @deprecated Prefer airports from src/data/airports.ts */
export { airports as mockAirports } from "@/data/airports";

/** Static sample offers for homepage teasers */
export function getHomepageSampleOffers(): FlightOffer[] {
  return generateMockOffers({
    tripType: "ONE_WAY",
    origin: "ISB",
    destination: "DXB",
    departureDate: "2026-09-15",
    adults: 1,
    cabinClass: "ECONOMY",
    currency: "PKR",
  }).slice(0, 4);
}

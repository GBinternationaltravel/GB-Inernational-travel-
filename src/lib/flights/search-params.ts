import type { CabinClass, TripType } from "@/types/flight";
import {
  flightSearchSchema,
  type FlightSearchInput,
} from "@/lib/validations/flight";

/** Canonical public URL parameter names for shareable flight searches. */
export const searchParamKeys = {
  from: "from",
  to: "to",
  departure: "departure",
  return: "return",
  adults: "adults",
  children: "children",
  infants: "infants",
  cabin: "cabin",
  trip: "trip",
} as const;

const tripToParam: Record<TripType, string> = {
  ONE_WAY: "oneway",
  ROUND_TRIP: "roundtrip",
  MULTI_CITY: "multicity",
};

const paramToTrip: Record<string, TripType> = {
  oneway: "ONE_WAY",
  roundtrip: "ROUND_TRIP",
  multicity: "MULTI_CITY",
};

const cabinToParam: Record<CabinClass, string> = {
  ECONOMY: "economy",
  PREMIUM_ECONOMY: "premium_economy",
  BUSINESS: "business",
  FIRST: "first",
};

const paramToCabin: Record<string, CabinClass> = {
  economy: "ECONOMY",
  premium_economy: "PREMIUM_ECONOMY",
  business: "BUSINESS",
  first: "FIRST",
};

export type SearchFormValues = {
  tripType: TripType;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
};

export function defaultSearchFormValues(): SearchFormValues {
  return {
    tripType: "ROUND_TRIP",
    origin: "ISB",
    destination: "DXB",
    departureDate: "",
    returnDate: "",
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "ECONOMY",
  };
}

export function buildSearchParams(values: SearchFormValues): URLSearchParams {
  const params = new URLSearchParams();
  params.set(searchParamKeys.trip, tripToParam[values.tripType]);
  params.set(searchParamKeys.from, values.origin.toUpperCase());
  params.set(searchParamKeys.to, values.destination.toUpperCase());
  params.set(searchParamKeys.departure, values.departureDate);
  if (values.tripType === "ROUND_TRIP" && values.returnDate) {
    params.set(searchParamKeys.return, values.returnDate);
  }
  params.set(searchParamKeys.adults, String(values.adults));
  if (values.children > 0) params.set(searchParamKeys.children, String(values.children));
  if (values.infants > 0) params.set(searchParamKeys.infants, String(values.infants));
  params.set(searchParamKeys.cabin, cabinToParam[values.cabinClass]);
  return params;
}

export function buildResultsHref(values: SearchFormValues): string {
  return `/flights/results?${buildSearchParams(values).toString()}`;
}

function readParam(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? undefined;
  }
  const value = source[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseSearchParams(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
): SearchFormValues {
  const defaults = defaultSearchFormValues();
  const tripRaw = readParam(source, searchParamKeys.trip)?.toLowerCase();
  const cabinRaw = readParam(source, searchParamKeys.cabin)?.toLowerCase();

  return {
    tripType: (tripRaw && paramToTrip[tripRaw]) || defaults.tripType,
    origin: (readParam(source, searchParamKeys.from) ?? defaults.origin).toUpperCase(),
    destination: (readParam(source, searchParamKeys.to) ?? defaults.destination).toUpperCase(),
    departureDate: readParam(source, searchParamKeys.departure) ?? "",
    returnDate: readParam(source, searchParamKeys.return) ?? "",
    adults: Number(readParam(source, searchParamKeys.adults) ?? defaults.adults) || 1,
    children: Number(readParam(source, searchParamKeys.children) ?? 0) || 0,
    infants: Number(readParam(source, searchParamKeys.infants) ?? 0) || 0,
    cabinClass: (cabinRaw && paramToCabin[cabinRaw]) || defaults.cabinClass,
  };
}

export function parseAndValidateSearchParams(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
):
  | { success: true; data: FlightSearchInput; form: SearchFormValues }
  | { success: false; form: SearchFormValues; message: string } {
  const form = parseSearchParams(source);
  const parsed = flightSearchSchema.safeParse({
    tripType: form.tripType,
    origin: form.origin,
    destination: form.destination,
    departureDate: form.departureDate,
    returnDate: form.returnDate || undefined,
    adults: form.adults,
    children: form.children,
    infants: form.infants,
    cabinClass: form.cabinClass,
    currency: "PKR",
  });

  if (!parsed.success) {
    return {
      success: false,
      form,
      message: parsed.error.issues[0]?.message ?? "Please check your search details.",
    };
  }

  return { success: true, data: parsed.data, form };
}

import { getAirportByCode } from "@/data/airports";
import type { FlightOffer } from "@/types/flight";
import type { TripType } from "@/types/flight";

const PAKISTAN_COUNTRY = "pakistan";
const PAKISTANI_NATIONALITY = "PK";
const SUPPLIERS_REQUIRING_SURNAME = new Set(["TRAVELPORT"]);

export type PassengerIdentityMode = "simplified" | "full";

export type PassengerIdentityRules = {
  mode: PassengerIdentityMode;
  itineraryDomesticPakistan: boolean;
  pakistaniTraveler: boolean;
  showLastName: boolean;
  requireLastName: boolean;
  showPassport: boolean;
  requirePassport: boolean;
  lastNameRequiredMessage: string;
  passportRequiredMessage: string;
};

export function isPakistanCountry(country: string | null | undefined): boolean {
  const normalized = (country ?? "").trim().toLowerCase();
  return normalized === PAKISTAN_COUNTRY || normalized === "pk";
}

/**
 * Authoritative airport-country lookup. The curated airport catalog wins for
 * known IATA codes. Segment country hints are used only when the code is unknown.
 * Unknown codes without a Pakistan hint are not treated as Pakistan.
 */
export function isPakistanAirport(
  code: string,
  countryHint?: string | null,
): boolean {
  const airport = getAirportByCode(code);
  if (airport) {
    return isPakistanCountry(airport.country);
  }
  if (countryHint && countryHint.trim()) {
    return isPakistanCountry(countryHint);
  }
  return false;
}

export function isDomesticPakistanRoute(
  origin: string,
  destination: string,
  originCountry?: string | null,
  destinationCountry?: string | null,
): boolean {
  return (
    isPakistanAirport(origin, originCountry) &&
    isPakistanAirport(destination, destinationCountry)
  );
}

export function airportCodesFromOffer(offer: FlightOffer): string[] {
  const codes: string[] = [];
  for (const segment of offer.segments) {
    codes.push(segment.origin.iataCode, segment.destination.iataCode);
  }
  return codes;
}

export function offerAirportsAreDomesticPakistan(offer: FlightOffer): boolean {
  if (!offer.segments.length) return false;
  return offer.segments.every(
    (segment) =>
      isPakistanAirport(segment.origin.iataCode, segment.origin.country) &&
      isPakistanAirport(segment.destination.iataCode, segment.destination.country),
  );
}

export function isDomesticPakistanItinerary(input: {
  origin: string;
  destination: string;
  tripType: TripType;
  outboundOffer?: FlightOffer | null;
  returnOffer?: FlightOffer | null;
}): boolean {
  const outboundDomestic = input.outboundOffer
    ? offerAirportsAreDomesticPakistan(input.outboundOffer)
    : isDomesticPakistanRoute(input.origin, input.destination);

  if (!outboundDomestic) return false;

  if (input.tripType === "ROUND_TRIP") {
    if (input.returnOffer) {
      return offerAirportsAreDomesticPakistan(input.returnOffer);
    }
    return isDomesticPakistanRoute(input.destination, input.origin);
  }

  return true;
}

export function isPakistaniTraveler(nationality: string | null | undefined): boolean {
  return (nationality ?? "").trim().toUpperCase() === PAKISTANI_NATIONALITY;
}

export function supplierRequiresSurname(
  ...supplierCodes: Array<string | null | undefined>
): boolean {
  return supplierCodes.some((code) =>
    SUPPLIERS_REQUIRING_SURNAME.has((code ?? "").trim().toUpperCase()),
  );
}

export function resolvePassengerIdentityRules(input: {
  itineraryDomesticPakistan: boolean;
  nationality: string;
  supplierCode?: string | null;
  returnSupplierCode?: string | null;
}): PassengerIdentityRules {
  const pakistaniTraveler = isPakistaniTraveler(input.nationality);
  const surnameRequiredBySupplier = supplierRequiresSurname(
    input.supplierCode,
    input.returnSupplierCode,
  );

  if (input.itineraryDomesticPakistan && pakistaniTraveler) {
    return {
      mode: "simplified",
      itineraryDomesticPakistan: true,
      pakistaniTraveler: true,
      showLastName: surnameRequiredBySupplier,
      requireLastName: surnameRequiredBySupplier,
      showPassport: false,
      requirePassport: false,
      lastNameRequiredMessage:
        "A surname is required by the selected flight supplier.",
      passportRequiredMessage: "Please enter a valid passport number",
    };
  }

  return {
    mode: "full",
    itineraryDomesticPakistan: input.itineraryDomesticPakistan,
    pakistaniTraveler,
    showLastName: true,
    requireLastName: true,
    showPassport: true,
    requirePassport: true,
    lastNameRequiredMessage: "This field is required",
    passportRequiredMessage: "Please enter a valid passport number",
  };
}

/**
 * Values kept in UI state must not be submitted when the current context hides them.
 * Does not invent a surname or passport number.
 */
export function passengerIdentitySubmitFields(
  passenger: {
    lastName: string;
    passportNumber: string;
    passportIssuingCountry: string;
    passportExpiry: string;
  },
  rules: PassengerIdentityRules,
): {
  lastName: string;
  passportNumber: string;
  passportIssuingCountry: string;
  passportExpiry: string;
} {
  return {
    lastName: rules.showLastName ? passenger.lastName.trim() : "",
    passportNumber: rules.showPassport ? passenger.passportNumber.trim() : "",
    passportIssuingCountry: rules.showPassport
      ? passenger.passportIssuingCountry.trim()
      : "",
    passportExpiry: rules.showPassport ? passenger.passportExpiry.trim() : "",
  };
}

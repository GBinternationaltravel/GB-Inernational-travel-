/**
 * Normalize Travelport CatalogProductOfferings / OfferList responses
 * into GB FlightOffer models. Missing optional fields are handled safely.
 */

import type {
  CabinClass,
  CurrencyCode,
  FlightOffer,
  FlightSegmentOffer,
  TripType,
} from "@/types/flight";
import { getAirportByCode } from "@/data/airports";
import { getAirlineByCode } from "@/data/airlines";

type AnyRecord = Record<string, unknown>;

export type TravelportNormalizedSearch = {
  offers: FlightOffer[];
  catalogOfferingsId: string | null;
};

export function normalizeTravelportSearchResponse(
  payload: unknown,
  context: {
    tripType: TripType;
    cabinClass: CabinClass;
    currency: CurrencyCode;
  },
): TravelportNormalizedSearch {
  const root = asRecord(payload);
  const offeringsWrapper =
    asRecord(root.CatalogProductOfferingsResponse)?.CatalogProductOfferings ??
    asRecord(root.CatalogProductOfferings) ??
    root;

  const offeringsObj = asRecord(offeringsWrapper);
  const catalogOfferingsId =
    readIdentifier(offeringsObj.Identifier) ||
    (typeof offeringsObj.id === "string" ? offeringsObj.id : null);

  const offeringList = asArray(
    offeringsObj.CatalogProductOffering ?? offeringsObj.CatalogProductOfferings,
  );

  const referenceFlights = indexReferenceFlights(root, offeringsObj);
  const offers: FlightOffer[] = [];

  for (const rawOffering of offeringList) {
    const offering = asRecord(rawOffering);
    const offeringId =
      (typeof offering.id === "string" && offering.id) ||
      readIdentifier(offering.Identifier) ||
      `tp-offer-${offers.length + 1}`;

    const brandOptions = asArray(offering.ProductBrandOptions);
    for (const brandOptionRaw of brandOptions.length ? brandOptions : [offering]) {
      const brandOption = asRecord(brandOptionRaw);
      const brandOfferings = asArray(
        brandOption.ProductBrandOffering ?? brandOption.Product,
      );

      for (const brandOfferingRaw of brandOfferings.length ? brandOfferings : [brandOption]) {
        const brandOffering = asRecord(brandOfferingRaw);
        const product = asRecord(
          asArray(brandOffering.Product)[0] ?? brandOffering.Product ?? brandOffering,
        );
        const productId =
          (typeof product.id === "string" && product.id) ||
          (typeof product.productRef === "string" && product.productRef) ||
          readIdentifier(product.Identifier) ||
          offeringId;

        const flightRefs = collectFlightRefs(product, brandOffering, brandOption);
        const segments = flightRefs
          .map((ref) => toSegment(referenceFlights.get(ref) ?? { id: ref }, ref))
          .filter((segment): segment is FlightSegmentOffer => Boolean(segment));

        if (!segments.length) {
          // Some payloads embed flight details on the product
          const embedded = asArray(product.FlightSegment ?? product.flightSegment);
          for (const item of embedded) {
            const segment = toSegment(asRecord(item), String(offers.length));
            if (segment) segments.push(segment);
          }
        }

        if (!segments.length) continue;

        const price = extractPrice(brandOffering, product, offering);
        const total = price.total ?? 0;
        const currency = preserveCurrency(price.currency, context.currency);
        const airlineCode =
          segments[0]?.airline.iataCode ||
          String(brandOffering.Brand ?? brandOption.Brand ?? "XX");
        const baggageKg = extractBaggageKg(brandOffering, product);
        const baggageKnown = baggageKg > 0;

        const internalId = `tp-${offeringId}-${productId}`.toLowerCase();
        offers.push({
          id: internalId,
          providerCode: "TRAVELPORT",
          supplierCode: "TRAVELPORT",
          supplierOfferId: offeringId,
          supplierSessionRef: JSON.stringify({
            catalogOfferingsId,
            catalogProductOfferingId: offeringId,
            productIds: [productId],
            environment: "sandbox",
          }),
          expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          isMock: false,
          airlineId: airlineCode.toLowerCase(),
          tripType: context.tripType,
          cabinClass: context.cabinClass,
          currency,
          totalPrice: total,
          segments,
          stops: Math.max(0, segments.length - 1),
          durationMinutes: segments.reduce((sum, s) => sum + s.durationMinutes, 0),
          baggageKg: baggageKnown ? baggageKg : 0,
          baggageIncluded: baggageKnown,
          refundable: nullAsBool(brandOffering.refundable) ?? false,
          marketingCarrier: segments[0]?.airline ?? null,
          operatingCarrier: segments[0]?.airline ?? null,
          fareFamily:
            (typeof brandOffering.Brand === "string" && brandOffering.Brand) ||
            (typeof product.Brand === "string" && product.Brand) ||
            null,
          baseFare: price.base,
          taxes: price.taxes,
          fees: price.fees,
          changeable: null,
          fareRules: null,
        });
      }
    }
  }

  return { offers, catalogOfferingsId };
}

export function normalizeTravelportPriceResponse(
  payload: unknown,
  previous: FlightOffer,
): { total: number; currency: string; offer: FlightOffer } {
  const root = asRecord(payload);
  const offerList =
    asRecord(root.OfferListResponse) ??
    asRecord(root.OfferResponse) ??
    root;
  const offers = asArray(offerList.Offer ?? offerList.Offers);
  const first = asRecord(offers[0] ?? offerList);
  const price = extractPrice(first, asRecord(first.Product), first);
  const total = price.total ?? previous.totalPrice;
  const currency = price.currency || previous.currency;

  const identifier =
    readIdentifier(offerList.Identifier) ||
    readIdentifier(first.Identifier) ||
    previous.supplierSessionRef;

  return {
    total,
    currency,
    offer: {
      ...previous,
      totalPrice: total,
      currency: currency as CurrencyCode,
      baseFare: price.base ?? previous.baseFare,
      taxes: price.taxes ?? previous.taxes,
      fees: price.fees ?? previous.fees,
      supplierSessionRef: previous.supplierSessionRef,
      expiresAt: previous.expiresAt ?? new Date(Date.now() + 30 * 60_000).toISOString(),
      // Keep price transaction id available for later booking steps
      ...(identifier
        ? {
            supplierSessionRef: mergeSession(previous.supplierSessionRef, {
              priceTransactionId: identifier,
            }),
          }
        : {}),
    },
  };
}

function mergeSession(
  existing: string | null | undefined,
  patch: Record<string, unknown>,
): string {
  try {
    const parsed = existing ? (JSON.parse(existing) as Record<string, unknown>) : {};
    return JSON.stringify({ ...parsed, ...patch });
  } catch {
    return JSON.stringify(patch);
  }
}

function indexReferenceFlights(
  root: AnyRecord,
  offeringsObj: AnyRecord,
): Map<string, AnyRecord> {
  const map = new Map<string, AnyRecord>();
  const lists = [
    ...asArray(asRecord(root.ReferenceList).Flight),
    ...asArray(asRecord(root.ReferenceListFlight).Flight),
    ...asArray(asRecord(offeringsObj.ReferenceList).Flight),
    ...asArray(root.Flight),
  ];
  for (const item of lists) {
    const flight = asRecord(item);
    const id =
      (typeof flight.id === "string" && flight.id) ||
      (typeof flight.FlightRef === "string" && flight.FlightRef) ||
      readIdentifier(flight.Identifier);
    if (id) map.set(id, flight);
  }
  return map;
}

function collectFlightRefs(
  product: AnyRecord,
  brandOffering: AnyRecord,
  brandOption: AnyRecord,
): string[] {
  const refs: string[] = [];
  const candidates = [
    ...asArray(product.FlightRef),
    ...asArray(product.flightRef),
    ...asArray(brandOffering.FlightRef),
    ...asArray(brandOption.FlightRef),
    ...asArray(asRecord(product.FlightSegment).FlightRef),
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string") refs.push(candidate);
    else {
      const record = asRecord(candidate);
      if (typeof record.value === "string") refs.push(record.value);
      if (typeof record.FlightRef === "string") refs.push(record.FlightRef);
    }
  }
  return refs;
}

function toSegment(flight: AnyRecord, fallbackId: string): FlightSegmentOffer | null {
  const originCode =
    readCode(flight.Departure ?? flight.departure ?? flight.Origin) ||
    readCode(asRecord(flight.Departure).location) ||
    "";
  const destinationCode =
    readCode(flight.Arrival ?? flight.arrival ?? flight.Destination) ||
    readCode(asRecord(flight.Arrival).location) ||
    "";

  const departureAt =
    readDateTime(flight.Departure ?? flight.departure) ||
    (typeof flight.DepartureDateTime === "string" ? flight.DepartureDateTime : null);
  const arrivalAt =
    readDateTime(flight.Arrival ?? flight.arrival) ||
    (typeof flight.ArrivalDateTime === "string" ? flight.ArrivalDateTime : null);

  if (!originCode || !destinationCode || !departureAt || !arrivalAt) {
    return null;
  }

  const carrierCode =
    readCode(flight.Carrier ?? flight.carrier ?? flight.MarketingCarrier) ||
    readCode(asRecord(flight.OperatingCarrier).value) ||
    "XX";
  const flightNumber =
    String(
      flight.number ??
        flight.FlightNumber ??
        asRecord(flight.Flight).number ??
        fallbackId,
    ).replace(/^[A-Z]{2}/, carrierCode) || `${carrierCode}0`;

  const originAirport = getAirportByCode(originCode);
  const destinationAirport = getAirportByCode(destinationCode);
  const airline = getAirlineByCode(carrierCode);

  const durationMinutes =
    Number(flight.duration ?? flight.Duration ?? 0) ||
    Math.max(
      0,
      Math.round(
        (new Date(arrivalAt).getTime() - new Date(departureAt).getTime()) / 60_000,
      ),
    );

  return {
    origin: {
      iataCode: originCode,
      name: originAirport?.name ?? originCode,
      city: originAirport?.city ?? originCode,
      country: originAirport?.country ?? "",
    },
    destination: {
      iataCode: destinationCode,
      name: destinationAirport?.name ?? destinationCode,
      city: destinationAirport?.city ?? destinationCode,
      country: destinationAirport?.country ?? "",
    },
    departureAt,
    arrivalAt,
    durationMinutes,
    flightNumber: flightNumber.includes(carrierCode)
      ? flightNumber
      : `${carrierCode}${flightNumber}`,
    airline: {
      iataCode: carrierCode,
      name: airline?.name ?? carrierCode,
    },
    aircraftCode:
      typeof flight.equipment === "string"
        ? flight.equipment
        : typeof asRecord(flight.Equipment).value === "string"
          ? String(asRecord(flight.Equipment).value)
          : undefined,
  };
}

function extractPrice(
  ...sources: AnyRecord[]
): { total: number | null; base: number | null; taxes: number | null; fees: number | null; currency: string | null } {
  for (const source of sources) {
    const price =
      asRecord(source.Price) ||
      asRecord(source.BestCombinablePrice) ||
      asRecord(source.TotalPrice) ||
      asRecord(asRecord(source.PriceDetail).TotalPrice) ||
      source;

    const total = toNumber(
      price.TotalPrice ??
        price.totalPrice ??
        price.Amount ??
        price.value ??
        asRecord(price.TotalPrice).value,
    );
    const currency =
      (typeof price.CurrencyCode === "string" && price.CurrencyCode) ||
      (typeof price.currencyCode === "string" && price.currencyCode) ||
      (typeof asRecord(price.CurrencyCode).value === "string" &&
        String(asRecord(price.CurrencyCode).value)) ||
      null;
    const base = toNumber(price.Base ?? price.baseFare ?? price.BaseAmount);
    const taxes = toNumber(price.TotalTaxes ?? price.taxes ?? price.Taxes);
    const fees = toNumber(price.Fees ?? price.fees);

    if (total != null || base != null) {
      return {
        total: total ?? (base ?? 0) + (taxes ?? 0) + (fees ?? 0),
        base,
        taxes,
        fees,
        currency,
      };
    }
  }
  return { total: null, base: null, taxes: null, fees: null, currency: null };
}

function extractBaggageKg(...sources: AnyRecord[]): number {
  for (const source of sources) {
    const baggage = asRecord(source.BaggageAllowance ?? source.baggageAllowance);
    const weight = toNumber(baggage.Weight ?? baggage.weight ?? baggage.value);
    if (weight != null) return weight;
  }
  return 0;
}

/** Preserve supplier currency; never invent FX conversions. */
function preserveCurrency(
  supplierCurrency: string | null,
  fallback: CurrencyCode,
): CurrencyCode {
  const code = (supplierCurrency || fallback || "PKR").toUpperCase();
  const known: CurrencyCode[] = ["PKR", "USD", "EUR", "GBP", "AED"];
  if ((known as string[]).includes(code)) return code as CurrencyCode;
  // Keep unknown ISO codes without converting — cast for display pipeline.
  return code as CurrencyCode;
}

function readIdentifier(value: unknown): string | null {
  const record = asRecord(value);
  if (typeof record.value === "string") return record.value;
  if (typeof value === "string") return value;
  return null;
}

function readCode(value: unknown): string {
  if (typeof value === "string") return value.toUpperCase();
  const record = asRecord(value);
  if (typeof record.value === "string") return record.value.toUpperCase();
  if (typeof record.location === "string") return record.location.toUpperCase();
  if (typeof asRecord(record.location).value === "string") {
    return String(asRecord(record.location).value).toUpperCase();
  }
  return "";
}

function readDateTime(value: unknown): string | null {
  if (typeof value === "string" && value.includes("T")) return value;
  const record = asRecord(value);
  if (typeof record.date === "string" && typeof record.time === "string") {
    return `${record.date}T${record.time}`;
  }
  if (typeof record.DateTime === "string") return record.DateTime;
  if (typeof record.dateTime === "string") return record.dateTime;
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  const record = asRecord(value);
  if (typeof record.value === "number") return record.value;
  if (typeof record.value === "string" && !Number.isNaN(Number(record.value))) {
    return Number(record.value);
  }
  return null;
}

function nullAsBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

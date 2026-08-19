/**
 * Travelport TripServices booking builders + response parsers.
 * Docs:
 * - https://developer.travelport.com/docs/flights/guides/booking-and-reservations/flights-booking-guide
 * - POST book/session/reservationworkbench
 * - POST book/traveler/reservationworkbench/{id}/travelers/list
 * - POST book/airoffer/reservationworkbench/{id}/offers/buildfromcatalogproductofferings
 * - POST book/reservation/reservations/{id}
 */

import type { SupplierCreateBookingInput } from "@/providers/flights/supplier-types";

export type TravelportSessionIds = {
  catalogOfferingsId?: string | null;
  catalogProductOfferingId?: string;
  productIds?: string[];
  priceTransactionId?: string;
  workbenchId?: string;
  environment?: string;
};

export function parseTravelportSession(
  raw: string | null | undefined,
): TravelportSessionIds {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as TravelportSessionIds;
  } catch {
    return {};
  }
}

/** AirPrice identifiers append `_PC` — strip for Add Offer per Travelport docs. */
export function stripPriceSuffix(id: string): string {
  return id.endsWith("_PC") ? id.slice(0, -3) : id;
}

export function buildWorkbenchCreateBody() {
  // Documented New Workbench accepts an empty/minimal body for a new reservation session.
  return {};
}

export function buildAddOfferBody(session: TravelportSessionIds) {
  const catalogOfferingsId = stripPriceSuffix(
    session.priceTransactionId || session.catalogOfferingsId || "",
  );
  const offeringId = session.catalogProductOfferingId || "";
  const productIds = session.productIds?.length ? session.productIds : [];

  return {
    OfferQueryBuildFromCatalogProductOfferings: {
      BuildFromCatalogProductOfferingsRequest: {
        "@type": "BuildFromCatalogProductOfferingsRequestAir",
        CatalogProductOfferingsIdentifier: {
          Identifier: { value: catalogOfferingsId },
        },
        CatalogProductOfferingSelection: [
          {
            CatalogProductOfferingIdentifier: {
              Identifier: { value: offeringId },
            },
            ProductIdentifier: productIds.map((id) => ({
              Identifier: { value: id },
            })),
          },
        ],
      },
    },
  };
}

export function buildTravelersListBody(input: SupplierCreateBookingInput) {
  const travelers = input.passengers.map((passenger, index) => {
    const gender = mapGender(passenger.gender);
    const given = [passenger.firstName, passenger.middleName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const personName = {
      "@type": "PersonName",
      Given: given || passenger.firstName,
      ...(passenger.middleName ? { Middle: passenger.middleName } : {}),
      Surname: passenger.lastName,
    };

    const traveler: Record<string, unknown> = {
      "@type": "Traveler",
      id: `traveler_${index + 1}`,
      passengerTypeCode: mapPassengerType(passenger.type),
      PersonName: personName,
    };

    if (passenger.dateOfBirth) traveler.birthDate = passenger.dateOfBirth;
    if (gender) traveler.gender = gender;

    if (index === 0 && input.contactEmail) {
      traveler.Email = [{ value: input.contactEmail }];
    }
    if (index === 0 && input.contactPhone) {
      traveler.Telephone = [
        {
          "@type": "Telephone",
          phoneNumber: input.contactPhone.replace(/\D/g, "") || input.contactPhone,
          role: "Mobile",
        },
      ];
    }

    if (passenger.travelDocument?.number) {
      traveler.TravelDocument = [
        {
          "@type": "TravelDocumentDetail",
          docNumber: passenger.travelDocument.number,
          docType: "Passport",
          expireDate: passenger.travelDocument.expiry,
          issueCountry: passenger.travelDocument.issuingCountry,
          ...(passenger.dateOfBirth ? { birthDate: passenger.dateOfBirth } : {}),
          ...(gender ? { Gender: gender } : {}),
          ...(passenger.nationality ? { Nationality: passenger.nationality } : {}),
          PersonName: personName,
        },
      ];
    }

    return traveler;
  });

  return {
    TravelerListRequest: {
      Traveler: travelers,
    },
  };
}

export function buildCommitBody() {
  // Enable two-step commit so price changes do not silently book.
  return {
    ReservationQueryCommitReservation: {
      enableTwoStepCommitInd: true,
      errorWhenOfferPriceChangesInd: true,
      errorWhenScheduleChangesInd: true,
    },
  };
}

export function extractWorkbenchId(payload: unknown): string | null {
  const root = asRecord(payload);
  const reservation =
    asRecord(root.ReservationResponse).Reservation ??
    asRecord(root.ReservationResponse) ??
    root;
  return (
    readIdentifier(asRecord(reservation).Identifier) ||
    readIdentifier(asRecord(root.ReservationResponse).Identifier) ||
    readIdentifier(root.Identifier)
  );
}

export function extractLocator(payload: unknown): {
  locator: string | null;
  status: string | null;
  priceChanged: boolean;
  scheduleChanged: boolean;
} {
  const root = asRecord(payload);
  const reservationResponse = asRecord(root.ReservationResponse) || root;
  const reservation =
    asRecord(reservationResponse.Reservation) || reservationResponse;

  let locator: string | null = null;
  const receipts = asArray(reservation.Receipt ?? reservationResponse.Receipt);
  for (const receipt of receipts) {
    const record = asRecord(receipt);
    const confirmation = asRecord(record.Confirmation) || record;
    locator =
      readIdentifier(confirmation.Locator) ||
      (typeof confirmation.Locator === "string" ? confirmation.Locator : null) ||
      locator;
  }

  locator = normalizeSupplierLocator(locator);

  const resultStatus =
    (typeof asRecord(reservation.ReservationStatus).value === "string" &&
      String(asRecord(reservation.ReservationStatus).value)) ||
    (typeof reservation.status === "string" ? reservation.status : null) ||
    (locator ? "HELD" : null);

  const serialized = JSON.stringify(payload ?? {});
  const priceChanged =
    /offerPriceChanges|price has changed|PriceChange/i.test(serialized) &&
    !locator;
  const scheduleChanged =
    /scheduleChanges|schedule has changed|ScheduleChange/i.test(serialized) &&
    !locator;

  // Two-step commit warning without locator means booking not finalized.
  if (!locator && /two.?step|OfferModify|warning/i.test(serialized)) {
    return {
      locator: null,
      status: resultStatus,
      priceChanged: priceChanged || /price/i.test(serialized),
      scheduleChanged,
    };
  }

  return {
    locator,
    status: resultStatus,
    priceChanged,
    scheduleChanged,
  };
}

/**
 * Travelport held booking locators are typically 6 alphanumeric characters.
 * Never invent or accept empty/placeholder values.
 */
export function normalizeSupplierLocator(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().toUpperCase();
  if (!cleaned) return null;
  if (/^(NONE|NULL|UNDEFINED|N\/A|TEST|FAKE|MOCK)$/i.test(cleaned)) return null;
  // Real Travelport locator: 6 alphanumeric. Also accept longer host locators if present.
  if (!/^[A-Z0-9]{6,10}$/.test(cleaned)) return null;
  return cleaned;
}

function mapPassengerType(type: "ADULT" | "CHILD" | "INFANT"): string {
  if (type === "CHILD") return "CHD";
  if (type === "INFANT") return "INF";
  return "ADT";
}

function mapGender(
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED",
): string | null {
  if (gender === "MALE") return "Male";
  if (gender === "FEMALE") return "Female";
  if (gender === "OTHER" || gender === "UNSPECIFIED") return "Unknown";
  return null;
}

function readIdentifier(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  const record = asRecord(value);
  if (typeof record.value === "string" && record.value.trim()) return record.value.trim();
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

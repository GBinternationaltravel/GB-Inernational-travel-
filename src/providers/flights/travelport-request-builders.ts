/**
 * Build Travelport Search / AirPrice request payloads from documented schemas.
 * Search: POST catalog/search/catalogproductofferings
 * AirPrice: POST price/offers/buildfromcatalogproductofferings
 */

import type { CabinClass } from "@/types/flight";
import type { SupplierSearchRequest } from "@/providers/flights/supplier-types";

const cabinMap: Record<CabinClass, string> = {
  ECONOMY: "Economy",
  PREMIUM_ECONOMY: "PremiumEconomy",
  BUSINESS: "Business",
  FIRST: "First",
};

export function buildTravelportSearchRequest(request: SupplierSearchRequest) {
  const passengers: Array<Record<string, unknown>> = [];
  if (request.adults > 0) {
    passengers.push({
      "@type": "PassengerCriteria",
      number: request.adults,
      passengerTypeCode: "ADT",
    });
  }
  if (request.children > 0) {
    passengers.push({
      "@type": "PassengerCriteria",
      number: request.children,
      passengerTypeCode: "CHD",
    });
  }
  if (request.infants > 0) {
    passengers.push({
      "@type": "PassengerCriteria",
      number: request.infants,
      passengerTypeCode: "INF",
    });
  }

  const legs: Array<Record<string, unknown>> = [
    {
      "@type": "SearchCriteriaFlight",
      departureDate: request.departureDate,
      From: { value: request.origin.toUpperCase() },
      To: { value: request.destination.toUpperCase() },
    },
  ];

  if (request.tripType === "ROUND_TRIP" && request.returnDate) {
    legs.push({
      "@type": "SearchCriteriaFlight",
      departureDate: request.returnDate,
      From: { value: request.destination.toUpperCase() },
      To: { value: request.origin.toUpperCase() },
    });
  }

  if (request.legs?.length) {
    legs.length = 0;
    for (const leg of request.legs) {
      legs.push({
        "@type": "SearchCriteriaFlight",
        departureDate: leg.departureDate,
        From: { value: leg.origin.toUpperCase() },
        To: { value: leg.destination.toUpperCase() },
      });
    }
  }

  return {
    CatalogProductOfferingsQueryRequest: {
      CatalogProductOfferingsRequest: {
        "@type": "CatalogProductOfferingsRequestAir",
        // Invoke caching so AirPrice reference payload can follow.
        offersPerPage: 25,
        maxNumberOfUpsellsToReturn: 0,
        contentSourceList: ["GDS"],
        PassengerCriteria: passengers,
        SearchCriteriaFlight: legs,
        SearchModifiersAir: {
          "@type": "SearchModifiersAir",
          CabinPreference: [
            {
              "@type": "CabinPreference",
              cabin: cabinMap[request.cabinClass] ?? "Economy",
            },
          ],
        },
        CustomResponseModifiersAir: {
          SearchRepresentation: "Journey",
        },
      },
    },
  };
}

export function buildTravelportAirPriceRequest(input: {
  catalogOfferingsId: string;
  catalogProductOfferingId: string;
  productIds: string[];
}) {
  return {
    OfferQueryBuildFromCatalogProductOfferings: {
      BuildFromCatalogProductOfferingsRequest: {
        "@type": "BuildFromCatalogProductOfferingsRequestAir",
        CatalogProductOfferingsIdentifier: {
          Identifier: {
            value: input.catalogOfferingsId,
          },
        },
        CatalogProductOfferingSelection: [
          {
            CatalogProductOfferingIdentifier: {
              Identifier: {
                value: input.catalogProductOfferingId,
              },
            },
            ProductIdentifier: input.productIds.map((id) => ({
              Identifier: { value: id },
            })),
          },
        ],
      },
    },
  };
}

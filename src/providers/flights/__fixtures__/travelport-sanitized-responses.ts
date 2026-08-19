/**
 * Sanitized Travelport-like CatalogProductOfferings fixture.
 * No real customer data. Used for unit/normalization tests only —
 * NOT a live pre-production verification substitute.
 */

export const sanitizedTravelportSearchFixture = {
  CatalogProductOfferingsResponse: {
    CatalogProductOfferings: {
      Identifier: { value: "fixture-catalog-1" },
      CatalogProductOffering: [
        {
          id: "fixture-cpo-intl",
          ProductBrandOptions: [
            {
              ProductBrandOffering: [
                {
                  Brand: "Economy Standard",
                  Price: {
                    TotalPrice: 125000,
                    CurrencyCode: "PKR",
                    Base: 98000,
                    TotalTaxes: 27000,
                    Fees: 0,
                  },
                  Product: [
                    {
                      id: "fixture-prod-intl",
                      FlightRef: ["fixture-flt-1"],
                      BaggageAllowance: { Weight: 23 },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "fixture-cpo-domestic",
          ProductBrandOptions: [
            {
              ProductBrandOffering: [
                {
                  Brand: "Light",
                  Price: {
                    TotalPrice: 28000,
                    CurrencyCode: "PKR",
                    Base: 24000,
                    TotalTaxes: 4000,
                  },
                  Product: [
                    {
                      id: "fixture-prod-dom",
                      FlightRef: ["fixture-flt-dom"],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "fixture-cpo-multi",
          ProductBrandOptions: [
            {
              ProductBrandOffering: [
                {
                  Price: {
                    TotalPrice: 210000,
                    CurrencyCode: "USD",
                    Base: 1800,
                    TotalTaxes: 300,
                  },
                  Product: [
                    {
                      id: "fixture-prod-multi",
                      FlightRef: ["fixture-flt-a", "fixture-flt-b"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      ReferenceList: {
        Flight: [
          {
            id: "fixture-flt-1",
            Carrier: "PK",
            number: "209",
            Departure: { location: "ISB", date: "2026-10-15", time: "09:15:00" },
            Arrival: { location: "DXB", date: "2026-10-15", time: "11:45:00" },
            duration: 150,
          },
          {
            id: "fixture-flt-dom",
            Carrier: "PK",
            number: "302",
            Departure: { location: "ISB", date: "2026-10-20", time: "07:00:00" },
            Arrival: { location: "KHI", date: "2026-10-20", time: "09:10:00" },
            duration: 130,
          },
          {
            id: "fixture-flt-a",
            Carrier: "EK",
            number: "601",
            Departure: { location: "KHI", date: "2026-11-01", time: "02:30:00" },
            Arrival: { location: "DXB", date: "2026-11-01", time: "04:00:00" },
            duration: 90,
          },
          {
            id: "fixture-flt-b",
            Carrier: "EK",
            number: "5",
            Departure: { location: "DXB", date: "2026-11-01", time: "07:45:00" },
            Arrival: { location: "LHR", date: "2026-11-01", time: "12:10:00" },
            duration: 445,
          },
        ],
      },
    },
  },
};

export const sanitizedTravelportPriceValidFixture = {
  OfferListResponse: {
    Identifier: { value: "fixture-price-1" },
    Offer: [
      {
        Price: {
          TotalPrice: 125000,
          CurrencyCode: "PKR",
          Base: 98000,
          TotalTaxes: 27000,
        },
      },
    ],
  },
};

export const sanitizedTravelportPriceChangedFixture = {
  OfferListResponse: {
    Identifier: { value: "fixture-price-2" },
    Offer: [
      {
        Price: {
          TotalPrice: 132500,
          CurrencyCode: "PKR",
          Base: 104000,
          TotalTaxes: 28500,
        },
      },
    ],
  },
};

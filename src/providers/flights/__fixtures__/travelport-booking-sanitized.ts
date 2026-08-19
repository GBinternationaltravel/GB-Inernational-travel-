/**
 * Sanitized Travelport booking workflow fixtures — no real passenger data.
 */

export const sanitizedWorkbenchCreateFixture = {
  ReservationResponse: {
    Identifier: { value: "wb-fixture-001", authority: "Travelport" },
  },
};

export const sanitizedTravelerAddFixture = {
  TravelerResponse: {
    Traveler: [{ id: "traveler_1", Identifier: { value: "trv-1" } }],
  },
};

export const sanitizedAddOfferFixture = {
  OfferResponse: {
    Offer: [{ id: "offer-1" }],
  },
};

export const sanitizedCommitSuccessFixture = {
  ReservationResponse: {
    Reservation: {
      ReservationStatus: { value: "HELD" },
      Receipt: [
        {
          "@type": "ReceiptConfirmation",
          Confirmation: {
            Locator: { value: "AB12CD" },
          },
        },
      ],
    },
  },
};

export const sanitizedCommitPriceChangeFixture = {
  ReservationResponse: {
    Result: {
      Warning: [{ Message: "Offer price has changed since add offer" }],
    },
    OfferModify: [{ id: "modified" }],
  },
};

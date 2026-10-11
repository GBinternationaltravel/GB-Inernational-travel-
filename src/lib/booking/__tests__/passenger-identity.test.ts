import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDomesticPakistanItinerary,
  isDomesticPakistanRoute,
  isPakistanAirport,
  isPakistaniTraveler,
  offerAirportsAreDomesticPakistan,
  passengerIdentitySubmitFields,
  resolvePassengerIdentityRules,
  supplierRequiresSurname,
} from "@/lib/booking/passenger-identity";
import {
  bookingDraftSchema,
  bookingDraftSchemaForItinerary,
  collectPassengerIdentityFieldErrors,
  passengerSchema,
} from "@/lib/validations/booking";
import type { FlightOffer } from "@/types/flight";

function airport(
  iataCode: string,
  city: string,
  country: string,
): FlightOffer["segments"][number]["origin"] {
  return { iataCode, name: `${city} Airport`, city, country };
}

function offer(overrides: Partial<FlightOffer> & { from: string; to: string; fromCountry?: string; toCountry?: string }): FlightOffer {
  const fromCountry = overrides.fromCountry ?? (overrides.from === "DXB" || overrides.from === "LHR" ? "United Arab Emirates" : "Pakistan");
  const toCountry = overrides.toCountry ?? (overrides.to === "DXB" || overrides.to === "LHR" ? (overrides.to === "LHR" ? "United Kingdom" : "United Arab Emirates") : "Pakistan");
  return {
    id: overrides.id ?? `${overrides.from}-${overrides.to}`,
    providerCode: overrides.providerCode ?? "INVENTORY",
    supplierCode: overrides.supplierCode ?? "INVENTORY",
    supplierOfferId: overrides.supplierOfferId ?? "offer-1",
    isMock: overrides.isMock ?? false,
    airlineId: "pk",
    tripType: overrides.tripType ?? "ONE_WAY",
    cabinClass: "ECONOMY",
    currency: "PKR",
    totalPrice: 25000,
    segments: overrides.segments ?? [
      {
        origin: airport(overrides.from, overrides.from, fromCountry),
        destination: airport(overrides.to, overrides.to, toCountry),
        departureAt: "2026-11-01T05:00:00.000Z",
        arrivalAt: "2026-11-01T07:00:00.000Z",
        durationMinutes: 120,
        flightNumber: "PK100",
        airline: { iataCode: "PK", name: "PIA" },
      },
    ],
    stops: 0,
    durationMinutes: 120,
    baggageKg: 20,
    baggageIncluded: true,
    refundable: false,
  };
}

function adult(overrides: Record<string, unknown> = {}) {
  return {
    type: "ADULT" as const,
    firstName: "Ali",
    lastName: "Ahmed",
    dateOfBirth: "1990-01-01",
    gender: "MALE" as const,
    nationality: "PK",
    passportNumber: "AB1234567",
    passportIssuingCountry: "PK",
    passportExpiry: "2030-06-01",
    ...overrides,
  };
}

function draft(overrides: Record<string, unknown> = {}) {
  return {
    offerId: "offer-out",
    tripType: "ONE_WAY" as const,
    origin: "ISB",
    destination: "KHI",
    departureDate: "2026-11-01",
    cabinClass: "ECONOMY" as const,
    adults: 1,
    children: 0,
    infants: 0,
    supplierCode: "INVENTORY",
    contact: {
      email: "ali@example.com",
      phoneCountryCode: "+92",
      phone: "3001234567",
    },
    passengers: [adult()],
    ...overrides,
  };
}

describe("domestic Pakistan detection", () => {
  it("uses airport country data, not city-name strings", () => {
    assert.equal(isPakistanAirport("ISB"), true);
    assert.equal(isPakistanAirport("KDU"), true);
    assert.equal(isPakistanAirport("DXB"), false);
    assert.equal(isPakistanAirport("LHR"), false);
    assert.equal(isPakistanAirport("XXX"), false);
    assert.equal(isDomesticPakistanRoute("ISB", "KHI"), true);
    assert.equal(isDomesticPakistanRoute("ISB", "DXB"), false);
    assert.equal(isPakistaniTraveler("PK"), true);
    assert.equal(isPakistaniTraveler("AE"), false);
    assert.equal(isPakistanAirport("ISB", "PK"), true);
    assert.equal(isPakistanAirport("XYZ", "PK"), true);
    assert.equal(isPakistanAirport("XYZ", "Pakistan"), true);
  });

  it("prefers the airport catalog over a lying segment country hint", () => {
    assert.equal(isPakistanAirport("DXB", "Pakistan"), false);
    assert.equal(
      offerAirportsAreDomesticPakistan(
        offer({
          from: "ISB",
          to: "DXB",
          toCountry: "Pakistan",
        }),
      ),
      false,
    );
  });

  it("does not treat a round trip as domestic from the outbound leg alone", () => {
    const outbound = offer({ from: "ISB", to: "KHI" });
    const internationalReturn = offer({
      from: "KHI",
      to: "DXB",
      fromCountry: "Pakistan",
      toCountry: "United Arab Emirates",
    });
    assert.equal(offerAirportsAreDomesticPakistan(outbound), true);
    assert.equal(
      isDomesticPakistanItinerary({
        origin: "ISB",
        destination: "KHI",
        tripType: "ROUND_TRIP",
        outboundOffer: outbound,
        returnOffer: internationalReturn,
      }),
      false,
    );
  });

  it("client validation matches offer segments, not search endpoints alone", () => {
    const connecting = offer({
      from: "ISB",
      to: "KDU",
      segments: [
        {
          origin: airport("ISB", "Islamabad", "Pakistan"),
          destination: airport("DXB", "Dubai", "United Arab Emirates"),
          departureAt: "2026-11-01T05:00:00.000Z",
          arrivalAt: "2026-11-01T08:00:00.000Z",
          durationMinutes: 180,
          flightNumber: "EK601",
          airline: { iataCode: "EK", name: "Emirates" },
        },
        {
          origin: airport("DXB", "Dubai", "United Arab Emirates"),
          destination: airport("KDU", "Skardu", "Pakistan"),
          departureAt: "2026-11-01T10:00:00.000Z",
          arrivalAt: "2026-11-01T14:00:00.000Z",
          durationMinutes: 240,
          flightNumber: "PK130",
          airline: { iataCode: "PK", name: "PIA" },
        },
      ],
    });

    const payload = draft({
      origin: "ISB",
      destination: "KDU",
      passengers: [
        adult({
          lastName: "",
          passportNumber: "",
          passportIssuingCountry: "",
          passportExpiry: "",
        }),
      ],
    });

    const endpointsOnly = bookingDraftSchema.safeParse(payload);
    assert.equal(endpointsOnly.success, true);

    const withOffer = bookingDraftSchemaForItinerary({
      outboundOffer: connecting,
    }).safeParse(payload);
    assert.equal(withOffer.success, false);
    if (!withOffer.success) {
      const keys = withOffer.error.issues.map((issue) => issue.path.join("."));
      assert.ok(keys.some((key) => key.includes("passportNumber")));
    }
  });

  it("treats a connecting itinerary through a foreign airport as international", () => {
    const connecting = offer({
      from: "ISB",
      to: "KDU",
      segments: [
        {
          origin: airport("ISB", "Islamabad", "Pakistan"),
          destination: airport("DXB", "Dubai", "United Arab Emirates"),
          departureAt: "2026-11-01T05:00:00.000Z",
          arrivalAt: "2026-11-01T08:00:00.000Z",
          durationMinutes: 180,
          flightNumber: "EK601",
          airline: { iataCode: "EK", name: "Emirates" },
        },
        {
          origin: airport("DXB", "Dubai", "United Arab Emirates"),
          destination: airport("KDU", "Skardu", "Pakistan"),
          departureAt: "2026-11-01T10:00:00.000Z",
          arrivalAt: "2026-11-01T14:00:00.000Z",
          durationMinutes: 240,
          flightNumber: "PK130",
          airline: { iataCode: "PK", name: "PIA" },
        },
      ],
    });
    assert.equal(
      isDomesticPakistanItinerary({
        origin: "ISB",
        destination: "KDU",
        tripType: "ONE_WAY",
        outboundOffer: connecting,
      }),
      false,
    );
  });
});

describe("1. domestic Pakistan itinerary + Pakistani traveler", () => {
  it("hides passport and last-name fields and accepts the draft", () => {
    const rules = resolvePassengerIdentityRules({
      itineraryDomesticPakistan: true,
      nationality: "PK",
      supplierCode: "INVENTORY",
    });
    assert.equal(rules.showLastName, false);
    assert.equal(rules.showPassport, false);
    assert.equal(rules.requireLastName, false);
    assert.equal(rules.requirePassport, false);

    const parsed = bookingDraftSchema.safeParse(
      draft({
        passengers: [
          adult({
            lastName: "",
            passportNumber: "",
            passportIssuingCountry: "",
            passportExpiry: "",
          }),
        ],
      }),
    );
    assert.equal(parsed.success, true);
  });
});

describe("2. international itinerary keeps required identity fields", () => {
  it("requires last name and passport on ISB-DXB", () => {
    const rules = resolvePassengerIdentityRules({
      itineraryDomesticPakistan: false,
      nationality: "PK",
      supplierCode: "INVENTORY",
    });
    assert.equal(rules.showLastName, true);
    assert.equal(rules.showPassport, true);
    assert.equal(rules.requireLastName, true);
    assert.equal(rules.requirePassport, true);

    const missing = bookingDraftSchema.safeParse(
      draft({
        origin: "ISB",
        destination: "DXB",
        passengers: [
          adult({
            lastName: "",
            passportNumber: "",
            passportIssuingCountry: "",
            passportExpiry: "",
          }),
        ],
      }),
    );
    assert.equal(missing.success, false);
    if (!missing.success) {
      const keys = missing.error.issues.map((issue) => issue.path.join("."));
      assert.ok(keys.some((key) => key.includes("lastName")));
      assert.ok(keys.some((key) => key.includes("passportNumber")));
    }

    const complete = bookingDraftSchema.safeParse(
      draft({ origin: "ISB", destination: "DXB" }),
    );
    assert.equal(complete.success, true);
  });
});

describe("3. domestic itinerary + foreign traveler", () => {
  it("keeps identity and passport fields available and required", () => {
    const rules = resolvePassengerIdentityRules({
      itineraryDomesticPakistan: true,
      nationality: "AE",
      supplierCode: "INVENTORY",
    });
    assert.equal(rules.showLastName, true);
    assert.equal(rules.showPassport, true);
    assert.equal(isPakistaniTraveler("AE"), false);

    const missing = bookingDraftSchema.safeParse(
      draft({
        passengers: [
          adult({
            nationality: "AE",
            lastName: "",
            passportNumber: "",
            passportExpiry: "",
          }),
        ],
      }),
    );
    assert.equal(missing.success, false);
  });
});

describe("4. round trip with both legs domestic", () => {
  it("applies the simplified domestic identity rules", () => {
    assert.equal(
      isDomesticPakistanItinerary({
        origin: "ISB",
        destination: "KDU",
        tripType: "ROUND_TRIP",
        outboundOffer: offer({ from: "ISB", to: "KDU" }),
        returnOffer: offer({ from: "KDU", to: "ISB" }),
      }),
      true,
    );

    const parsed = bookingDraftSchema.safeParse(
      draft({
        tripType: "ROUND_TRIP",
        origin: "ISB",
        destination: "KDU",
        returnDate: "2026-11-10",
        returnOfferId: "offer-in",
        passengers: [
          adult({
            lastName: "",
            passportNumber: "",
            passportIssuingCountry: "",
            passportExpiry: "",
          }),
        ],
      }),
    );
    assert.equal(parsed.success, true);
  });
});

describe("5. round trip with an international leg", () => {
  it("keeps international passenger-information requirements", () => {
    assert.equal(
      isDomesticPakistanItinerary({
        origin: "ISB",
        destination: "DXB",
        tripType: "ROUND_TRIP",
        outboundOffer: offer({
          from: "ISB",
          to: "DXB",
          toCountry: "United Arab Emirates",
        }),
        returnOffer: offer({
          from: "DXB",
          to: "ISB",
          fromCountry: "United Arab Emirates",
        }),
      }),
      false,
    );

    const parsed = bookingDraftSchema.safeParse(
      draft({
        tripType: "ROUND_TRIP",
        origin: "ISB",
        destination: "DXB",
        returnDate: "2026-11-10",
        returnOfferId: "offer-in",
        passengers: [
          adult({
            lastName: "",
            passportNumber: "",
            passportExpiry: "",
          }),
        ],
      }),
    );
    assert.equal(parsed.success, false);
  });
});

describe("6. switching from domestic to international after passenger entry", () => {
  it("revalidates kept passenger data and does not invent identity fields", () => {
    const stored = {
      lastName: "Ahmed",
      passportNumber: "AB1234567",
      passportIssuingCountry: "PK",
      passportExpiry: "2030-06-01",
    };
    const domesticRules = resolvePassengerIdentityRules({
      itineraryDomesticPakistan: true,
      nationality: "PK",
      supplierCode: "INVENTORY",
    });
    const hiddenSubmit = passengerIdentitySubmitFields(stored, domesticRules);
    assert.equal(hiddenSubmit.lastName, "");
    assert.equal(hiddenSubmit.passportNumber, "");

    const internationalRules = resolvePassengerIdentityRules({
      itineraryDomesticPakistan: false,
      nationality: "PK",
      supplierCode: "INVENTORY",
    });
    const shownSubmit = passengerIdentitySubmitFields(stored, internationalRules);
    assert.equal(shownSubmit.lastName, "Ahmed");
    assert.equal(shownSubmit.passportNumber, "AB1234567");

    const afterSwitch = bookingDraftSchema.safeParse(
      draft({
        origin: "ISB",
        destination: "DXB",
        passengers: [adult(hiddenSubmit)],
      }),
    );
    assert.equal(afterSwitch.success, false);
  });
});

describe("7. hidden optional fields do not cause validation errors", () => {
  it("accepts empty last name and passport for domestic Pakistani travelers", () => {
    const parsed = bookingDraftSchema.safeParse(
      draft({
        passengers: [
          adult({
            lastName: "",
            passportNumber: "",
            passportIssuingCountry: "",
            passportExpiry: "",
          }),
        ],
      }),
    );
    assert.equal(parsed.success, true);
  });
});

describe("8. required supplier surname remains validated", () => {
  it("requires a surname for Travelport even on domestic Pakistani itineraries", () => {
    assert.equal(supplierRequiresSurname("TRAVELPORT"), true);
    const rules = resolvePassengerIdentityRules({
      itineraryDomesticPakistan: true,
      nationality: "PK",
      supplierCode: "TRAVELPORT",
    });
    assert.equal(rules.showLastName, true);
    assert.equal(rules.requireLastName, true);
    assert.equal(rules.showPassport, false);

    const missing = bookingDraftSchema.safeParse(
      draft({
        supplierCode: "TRAVELPORT",
        passengers: [adult({ lastName: "", passportNumber: "", passportExpiry: "" })],
      }),
    );
    assert.equal(missing.success, false);
    if (!missing.success) {
      const keys = missing.error.issues.map((issue) => issue.path.join("."));
      assert.ok(keys.some((key) => key.includes("lastName")));
      assert.ok(!keys.some((key) => key.includes("passportNumber")));
    }

    const present = bookingDraftSchema.safeParse(
      draft({
        supplierCode: "TRAVELPORT",
        passengers: [adult({ passportNumber: "", passportIssuingCountry: "", passportExpiry: "" })],
      }),
    );
    assert.equal(present.success, true);
  });
});

describe("9. server-side validation matches UI identity rules", () => {
  it("returns the same field errors the form would show", () => {
    const uiRules = resolvePassengerIdentityRules({
      itineraryDomesticPakistan: true,
      nationality: "AE",
      supplierCode: "INVENTORY",
    });
    const serverFields = collectPassengerIdentityFieldErrors(
      adult({
        nationality: "AE",
        lastName: "",
        passportNumber: "",
        passportIssuingCountry: "",
        passportExpiry: "",
      }),
      uiRules,
      0,
    );
    assert.ok(serverFields["passengers.0.lastName"]);
    assert.ok(serverFields["passengers.0.passportNumber"]);

    const schema = bookingDraftSchema.safeParse(
      draft({
        passengers: [
          adult({
            nationality: "AE",
            lastName: "",
            passportNumber: "",
            passportExpiry: "",
          }),
        ],
      }),
    );
    assert.equal(schema.success, false);
  });
});

describe("10. existing one-way and round-trip booking payloads still parse", () => {
  it("accepts a complete one-way international booking payload", () => {
    const parsed = bookingDraftSchema.safeParse(
      draft({ origin: "ISB", destination: "DXB" }),
    );
    assert.equal(parsed.success, true);
  });

  it("accepts a complete round-trip international booking payload", () => {
    const parsed = bookingDraftSchema.safeParse(
      draft({
        tripType: "ROUND_TRIP",
        origin: "ISB",
        destination: "DXB",
        returnDate: "2026-11-12",
        returnOfferId: "offer-in",
      }),
    );
    assert.equal(parsed.success, true);
  });

  it("keeps standalone passengerSchema on the full identity contract", () => {
    const missing = passengerSchema.safeParse(
      adult({ lastName: "", passportNumber: "" }),
    );
    assert.equal(missing.success, false);
  });
});

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  destinationCities,
  destinationPath,
  getCityBySlugs,
  listCityDestinationPaths,
  toDestinationSlug,
} from "@/data/destinations/catalog";
import { MockWeatherProvider } from "@/providers/weather/mock-weather-provider";
import { ConsoleNotificationProvider } from "@/providers/notifications/console-notification-provider";
import { MockFlightStatusProvider } from "@/providers/flight-status/mock-flight-status-provider";
import {
  setFlightStatusProvider,
  setNotificationProvider,
  setWeatherProvider,
} from "@/providers/registry";
import { getDestinationWeather } from "@/services/weather-service";
import {
  buildTravelReminderPlan,
  dispatchTravelNotification,
  sanitizeNotificationMetadata,
  sendNotification,
} from "@/services/notification-service";
import { createTravelNotification } from "@/services/notification-templates";
import { lookupFlightStatus } from "@/services/flight-status-service";
import { destinationCityMetadata } from "@/lib/seo/destination-seo";
import { maskPassport } from "@/lib/booking/masking";
import { toSafeBookingView } from "@/lib/booking/to-safe-view";
import type { StoredBooking } from "@/lib/booking/repository";
import { absoluteUrl } from "@/lib/seo/metadata";

describe("Phase 8 destination catalog", () => {
  it("generates clean destination slugs", () => {
    assert.equal(toDestinationSlug("United Arab Emirates"), "united-arab-emirates");
    assert.equal(toDestinationSlug("New York"), "new-york");
    assert.equal(toDestinationSlug("  Kuala Lumpur "), "kuala-lumpur");
  });

  it("builds country/city paths", () => {
    assert.equal(
      destinationPath("united-arab-emirates", "dubai"),
      "/destinations/united-arab-emirates/dubai",
    );
    assert.equal(destinationPath("pakistan"), "/destinations/pakistan");
  });

  it("includes required launch destinations", () => {
    const required = [
      "islamabad",
      "lahore",
      "karachi",
      "dubai",
      "abu-dhabi",
      "doha",
      "riyadh",
      "jeddah",
      "istanbul",
      "london",
      "kuala-lumpur",
      "bangkok",
      "singapore",
      "toronto",
      "new-york",
    ];
    for (const slug of required) {
      assert.ok(
        destinationCities.some((c) => c.citySlug === slug),
        `missing destination ${slug}`,
      );
    }
    assert.equal(listCityDestinationPaths().length, destinationCities.length);
    assert.ok(getCityBySlugs("united-arab-emirates", "dubai"));
  });
});

describe("Phase 8 weather provider", () => {
  beforeEach(() => {
    setWeatherProvider(new MockWeatherProvider());
  });

  it("returns clearly labeled mock weather", async () => {
    const forecast = await getDestinationWeather("DXB");
    assert.ok(forecast);
    assert.equal(forecast!.isMock, true);
    assert.match(forecast!.dataLabel, /not live/i);
    assert.ok(typeof forecast!.current.temperatureC === "number");
    assert.ok(forecast!.travelSummary.length > 0);
  });

  it("returns null for unknown locations", async () => {
    const forecast = await getDestinationWeather("ZZZ");
    assert.equal(forecast, null);
  });
});

describe("Phase 8 notifications", () => {
  beforeEach(() => {
    setNotificationProvider(new ConsoleNotificationProvider());
  });

  it("creates travel notification templates", () => {
    const templates = [
      "PAYMENT_RECEIVED",
      "TICKETING_PENDING",
      "DEPARTURE_24_HOURS",
      "BOARDING_5_HOURS",
      "WEATHER_UPDATE",
      "FLIGHT_STATUS_CHANGE",
    ] as const;

    for (const template of templates) {
      const payload = createTravelNotification({
        template,
        bookingReference: "GB-TEST-001",
        recipientEmail: "traveler@example.com",
        destinationCity: "Dubai",
        flightNumber: "PK309",
      });
      assert.equal(payload.channel, "EMAIL");
      assert.equal(payload.recipient, "traveler@example.com");
      assert.ok(payload.body.includes("GB-TEST-001"));
      assert.ok(!/passport|cvv|card number/i.test(payload.body));
    }
  });

  it("dispatches via console provider only", async () => {
    const result = await dispatchTravelNotification({
      template: "PAYMENT_RECEIVED",
      bookingReference: "GB-TEST-002",
      recipientEmail: "traveler@example.com",
    });
    assert.equal(result.success, true);
    assert.equal(result.providerCode, "CONSOLE");
    assert.equal(result.isStub, true);
  });

  it("strips sensitive notification metadata", async () => {
    const cleaned = sanitizeNotificationMetadata({
      bookingReference: "GB-1",
      passportNumber: "AB1234567",
      cardNumber: "4111111111111111",
      note: "ok",
    });
    assert.deepEqual(cleaned, {
      bookingReference: "GB-1",
      note: "ok",
    });

    const result = await sendNotification({
      eventType: "WEATHER_ALERT",
      channel: "EMAIL",
      recipient: "a@b.com",
      body: "Weather sample update",
      metadata: { passport: "secret", safe: true },
    });
    assert.equal(result.success, true);
  });

  it("builds departure and boarding reminder plans", () => {
    const plan = buildTravelReminderPlan({
      bookingReference: "GB-REM-1",
      departureAt: "2026-09-01T10:00:00.000Z",
    });
    assert.equal(plan.reminders.length, 3);
    assert.ok(plan.reminders.some((r) => r.eventType === "DEPARTURE_REMINDER_24H"));
    assert.ok(plan.reminders.some((r) => r.eventType === "BOARDING_REMINDER"));
    assert.ok(
      plan.reminders.some((r) => /3 hours/i.test(r.description)),
      "3-hour travel reminder must be planned",
    );
  });
});

describe("Phase 8 flight status mock", () => {
  beforeEach(() => {
    setFlightStatusProvider(new MockFlightStatusProvider());
  });

  it("never fabricates live operational status", async () => {
    const result = await lookupFlightStatus({
      flightNumber: "PK309",
      date: "2026-09-01",
      origin: "ISB",
      destination: "DXB",
    });
    assert.ok(result);
    assert.equal(result!.isMock, true);
    assert.ok(
      ["SCHEDULED", "BOARDING", "DELAYED", "DEPARTED", "ARRIVED", "CANCELLED", "NOT_AVAILABLE"].includes(
        result!.status,
      ),
      `unexpected status ${result!.status}`,
    );
    assert.match(result!.dataLabel, /mock|not live|sample/i);
    // Mock must never invent a live gate assignment
    assert.equal(result!.gate, undefined);
  });
});

describe("Phase 8 destination metadata", () => {
  it("builds unique title, description, and canonical path", () => {
    const dubai = getCityBySlugs("united-arab-emirates", "dubai");
    assert.ok(dubai);
    const meta = destinationCityMetadata(dubai!);
    assert.match(String(meta.title), /Dubai/i);
    assert.match(String(meta.description), /Dubai|airport|flight/i);
    assert.equal(
      meta.alternates?.canonical,
      absoluteUrl("/destinations/united-arab-emirates/dubai"),
    );
  });
});

describe("Phase 8 protected My Trips data", () => {
  it("masks passport numbers in safe booking views", () => {
    assert.equal(maskPassport("AB1234567"), "****4567");

    const booking = {
      id: "b1",
      reference: "GB-SAFE-1",
      accessTokenHash: "hash",
      tripType: "ONE_WAY",
      status: "PAYMENT_RECEIVED",
      currency: "PKR",
      subtotalAmount: 100000,
      taxesAmount: 5000,
      feesAmount: 1000,
      totalAmount: 106000,
      contactEmail: "traveler@example.com",
      contactPhoneCountry: "+92",
      contactPhone: "3001234567",
      selectedOfferId: "offer-1",
      providerCode: "MOCK",
      termsAcceptedAt: new Date().toISOString(),
      expiresAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
      passengers: [
        {
          id: "p1",
          passengerType: "ADT",
          firstName: "Ali",
          middleName: undefined,
          lastName: "Khan",
          dateOfBirth: "1990-01-01",
          gender: "M",
          nationality: "PK",
          passportNumber: "PK9988776",
          passportIssuingCountry: "PK",
          passportExpiry: "2030-01-01",
        },
      ],
      offerSnapshot: {
        isMock: true,
        offerId: "offer-1",
        internalOfferId: "offer-1",
        supplierCode: "MOCK",
        supplierOfferId: "mock-1",
        providerCode: "MOCK",
        airlineId: "PK",
        airlineName: "Mock Air",
        flightNumber: "PK309",
        origin: "ISB",
        destination: "DXB",
        originCity: "Islamabad",
        destinationCity: "Dubai",
        departureAt: "2026-09-01T08:00:00.000Z",
        arrivalAt: "2026-09-01T11:00:00.000Z",
        durationMinutes: 180,
        stops: 0,
        cabinClass: "ECONOMY",
        baggageKg: 23,
        baggageIncluded: true,
        refundable: false,
        pricing: {
          currency: "PKR",
          baseFare: 100000,
          taxes: 5000,
          fees: 1000,
          total: 106000,
          isMock: true,
          notice: "Mock pricing",
        },
      },
      supplierCode: "MOCK",
      supplierBookingRef: null,
      supplierBookingStatus: null,
      supplierTicketingStatus: null,
    } as StoredBooking;

    const safe = toSafeBookingView(booking, "file");
    assert.equal(safe.passengers[0]?.passportMasked, "****8776");
    assert.equal(
      // @ts-expect-error intentional: full passport must not exist on safe view
      safe.passengers[0]?.passportNumber,
      undefined,
    );
    assert.match(safe.contactEmailMasked, /\*\*\*/);
    assert.ok(!JSON.stringify(safe).includes("PK9988776"));
  });
});

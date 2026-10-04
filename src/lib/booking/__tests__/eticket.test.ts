import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  airlineCodeFor,
  baggageLabel,
  buildETicketView,
  checkInHoursFor,
  cleanTicketNumbers,
  eTicketPath,
  eTicketUrl,
  formatTicketAmount,
  formatTicketDateTime,
  isBookingTicketed,
  isDomesticRoute,
  isPlaceholderTicketNumber,
  itineraryNoteFor,
  localTimeIfDifferent,
  passengerFullName,
  resolvePnr,
  type ETicketSourceBooking,
} from "@/lib/booking/eticket";
import { renderTravelEmail } from "@/lib/notifications/email-templates";
import type { OfferSnapshot } from "@/lib/booking/pricing";

function snapshot(overrides: Partial<OfferSnapshot> = {}): OfferSnapshot {
  return {
    isMock: false,
    offerId: "inv_1",
    internalOfferId: "inv_1",
    supplierCode: "INVENTORY",
    supplierOfferId: "inv-1",
    providerCode: "INVENTORY",
    airlineId: "pk",
    airlineName: "Pakistan International Airlines",
    flightNumber: "PK451",
    origin: "ISB",
    destination: "KDU",
    originCity: "Islamabad",
    destinationCity: "Skardu",
    // 08:00 → 09:00 PKT (UTC+5)
    departureAt: "2026-10-12T03:00:00.000Z",
    arrivalAt: "2026-10-12T04:00:00.000Z",
    durationMinutes: 60,
    stops: 0,
    cabinClass: "ECONOMY",
    baggageKg: 20,
    baggageIncluded: true,
    refundable: false,
    pricing: {
      currency: "PKR",
      baseFare: 15506,
      taxes: 0,
      fees: 2000,
      supplierFare: 31012,
      markupRate: 0.0645,
      feePerSeat: 1000,
      feeSeats: 2,
      total: 33012,
      isMock: false,
      notice: "",
    },
    ...overrides,
  };
}

function booking(overrides: Partial<ETicketSourceBooking> = {}): ETicketSourceBooking {
  return {
    reference: "GBTEST123",
    status: "CONFIRMED",
    tripType: "ONE_WAY",
    currency: "PKR",
    // Deliberately different from the snapshot: the e-ticket must use the snapshot.
    totalAmount: 99999,
    feesAmount: 1,
    subtotalAmount: 15506,
    taxesAmount: 0,
    supplierBookingRef: "ABC123",
    updatedAt: "2026-10-05T10:00:00.000Z",
    offerSnapshot: snapshot(),
    passengers: [
      { id: "p1", passengerType: "ADULT", firstName: "Ali", lastName: "Ahmed" },
      { id: "p2", passengerType: "CHILD", firstName: "Sara", middleName: "Noor", lastName: "Ahmed" },
    ],
    ...overrides,
  };
}

describe("e-ticket helpers", () => {
  it("builds the page path and absolute URL", () => {
    assert.equal(eTicketPath("GB6PYLLCNU"), "/my-trips/GB6PYLLCNU/ticket");
    assert.equal(
      eTicketUrl("GB6PYLLCNU", "https://www.gbinternationaltravels.com/"),
      "https://www.gbinternationaltravels.com/my-trips/GB6PYLLCNU/ticket",
    );
  });

  it("drops MANUAL- placeholders and duplicates from ticket numbers", () => {
    assert.equal(isPlaceholderTicketNumber("MANUAL-ABC123"), true);
    assert.equal(isPlaceholderTicketNumber("214-1234567890"), false);
    assert.deepEqual(
      cleanTicketNumbers(["MANUAL-ABC123", " 214-1234567890 ", "214-1234567890", null, ""]),
      ["214-1234567890"],
    );
  });

  it("prefers the ticket-row PNR over the supplier reference", () => {
    assert.equal(resolvePnr({ ticketPnrs: [null, "xyz789"], supplierBookingRef: "ABC123" }), "XYZ789");
    assert.equal(resolvePnr({ ticketPnrs: [], supplierBookingRef: " abc123 " }), "ABC123");
    assert.equal(resolvePnr({ ticketPnrs: [], supplierBookingRef: null }), null);
  });

  it("treats only CONFIRMED bookings with a PNR as ticketed", () => {
    assert.equal(isBookingTicketed({ status: "CONFIRMED", pnr: "ABC123" }), true);
    assert.equal(isBookingTicketed({ status: "CONFIRMED", pnr: "" }), false);
    assert.equal(isBookingTicketed({ status: "TICKETING_PENDING", pnr: "ABC123" }), false);
    assert.equal(isBookingTicketed({ status: "CANCELLED", pnr: "ABC123" }), false);
  });

  it("formats dates and times in Pakistan local time", () => {
    assert.deepEqual(formatTicketDateTime("2026-10-12T03:00:00.000Z"), {
      date: "Mon, 12 Oct 2026",
      time: "08:00",
    });
    // 21:30 UTC is 02:30 next day in PKT.
    assert.deepEqual(formatTicketDateTime("2026-09-11T21:30:00.000Z"), {
      date: "Sat, 12 Sep 2026",
      time: "02:30",
    });
    assert.deepEqual(formatTicketDateTime("not-a-date"), { date: "—", time: "—" });
  });

  it("formats PKR amounts with grouping", () => {
    assert.equal(formatTicketAmount(89507), "PKR 89,507");
    assert.equal(formatTicketAmount(1500.4, "PKR"), "PKR 1,500");
  });

  it("classifies domestic vs international routes for airport timing", () => {
    assert.equal(isDomesticRoute("ISB", "KDU"), true);
    assert.equal(isDomesticRoute("ISB", "GIL"), true);
    assert.equal(isDomesticRoute("ISB", "DXB"), false);
    assert.equal(isDomesticRoute("LHE", "JED"), false);
    assert.equal(isDomesticRoute("ISB", "ZZZ"), false);
    assert.equal(checkInHoursFor(true), 2);
    assert.equal(checkInHoursFor(false), 3);
  });

  it("derives airline code, baggage and passenger names", () => {
    assert.equal(airlineCodeFor({ airlineId: "pk", flightNumber: "PK451" }), "PK");
    assert.equal(airlineCodeFor({ airlineId: "", flightNumber: "9P842" }), "9P");
    assert.equal(baggageLabel({ baggageKg: 30, baggageIncluded: true }), "30 kg checked baggage");
    assert.equal(
      passengerFullName({ firstName: "Sara", middleName: "Noor", lastName: "Ahmed" }),
      "SARA NOOR AHMED",
    );
  });

  it("shows a local-time hint only for airports outside Pakistan time", () => {
    // 02:00 UTC = 07:00 PKT = 05:00 in Jeddah.
    assert.equal(localTimeIfDifferent("2026-11-03T02:00:00.000Z", "Asia/Riyadh"), "05:00");
    assert.equal(localTimeIfDifferent("2026-11-03T02:00:00.000Z", "Asia/Karachi"), null);
    assert.equal(localTimeIfDifferent("2026-11-03T02:00:00.000Z", null), null);
    assert.equal(localTimeIfDifferent("2026-11-03T02:00:00.000Z", "Not/AZone"), null);
  });

  it("adds an itinerary note only for stops or non one-way trips", () => {
    assert.equal(itineraryNoteFor({ stops: 0, tripType: "ONE_WAY" }), null);
    assert.match(itineraryNoteFor({ stops: 1, tripType: "ONE_WAY" }) ?? "", /1 stop\./);
    assert.match(itineraryNoteFor({ stops: 0, tripType: "ROUND_TRIP" }) ?? "", /return/);
  });
});

describe("buildETicketView", () => {
  it("uses the stored price snapshot, not booking totals or a recalculation", () => {
    const view = buildETicketView({ booking: booking() });
    assert.equal(view.price.total, 33012);
    assert.equal(view.price.serviceFee, 2000);
    assert.equal(view.price.airlineFare, 31012);
    assert.equal(view.price.serviceFeeBasis, "PKR 1,000 per seat × 2");
  });

  it("collects PNR, real ticket numbers, issue date and passengers", () => {
    const view = buildETicketView({
      booking: booking(),
      tickets: [
        { ticketNumber: "214-1111111111", pnr: "XYZ789", issuedAt: "2026-10-05T09:00:00.000Z" },
        { ticketNumber: "214-2222222222", pnr: "XYZ789", issuedAt: new Date("2026-10-05T08:00:00.000Z") },
      ],
      confirmedAt: "2026-10-06T00:00:00.000Z",
    });
    assert.equal(view.ticketed, true);
    assert.equal(view.pnr, "XYZ789");
    assert.deepEqual(view.ticketNumbers, ["214-1111111111", "214-2222222222"]);
    assert.equal(view.issuedAt, "2026-10-05T08:00:00.000Z");
    assert.deepEqual(
      view.passengers.map((p) => [p.name, p.type]),
      [
        ["ALI AHMED", "Adult"],
        ["SARA NOOR AHMED", "Child"],
      ],
    );
    assert.equal(view.segment.from.name, "Islamabad International Airport");
    assert.equal(view.segment.to.city, "Skardu");
    assert.deepEqual(view.segment.departure, { date: "Mon, 12 Oct 2026", time: "08:00", localTime: null });
    assert.equal(view.segment.cabin, "Economy");
    assert.equal(view.domestic, true);
    assert.equal(view.checkInHours, 2);
  });

  it("hides the manual placeholder and falls back to the supplier PNR", () => {
    const view = buildETicketView({
      booking: booking(),
      tickets: [{ ticketNumber: "MANUAL-ABC123", pnr: null, issuedAt: null }],
      confirmedAt: "2026-10-06T00:00:00.000Z",
    });
    assert.equal(view.pnr, "ABC123");
    assert.deepEqual(view.ticketNumbers, []);
    assert.equal(view.issuedAt, "2026-10-06T00:00:00.000Z");
  });

  it("is not ticketed before issuance", () => {
    const view = buildETicketView({
      booking: booking({ status: "TICKETING_PENDING", supplierBookingRef: null }),
    });
    assert.equal(view.ticketed, false);
    assert.equal(view.pnr, null);
  });

  it("gives 3-hour advice on international routes", () => {
    const view = buildETicketView({
      booking: booking({
        offerSnapshot: snapshot({ origin: "LHE", destination: "JED", originCity: "Lahore", destinationCity: "Jeddah" }),
      }),
    });
    assert.equal(view.domestic, false);
    assert.equal(view.checkInHours, 3);
  });

  it("adds the destination's local arrival time when its time zone is known", () => {
    const view = buildETicketView({
      booking: booking({
        offerSnapshot: snapshot({
          origin: "LHE",
          destination: "JED",
          departureAt: "2026-11-02T22:10:00.000Z",
          arrivalAt: "2026-11-03T02:00:00.000Z",
        }),
      }),
      airportTimeZones: { LHE: "Asia/Karachi", JED: "Asia/Riyadh" },
    });
    assert.equal(view.segment.departure.time, "03:10");
    assert.equal(view.segment.departure.localTime, null);
    assert.equal(view.segment.arrival.time, "07:00");
    assert.equal(view.segment.arrival.localTime, "05:00");
  });
});

describe("ticket-issued email", () => {
  it("links to the e-ticket only in the ticket-issued email", () => {
    const issued = renderTravelEmail({ template: "BOOKING_CONFIRMED", bookingReference: "GBTEST123" });
    assert.match(issued.text, /View \/ print your e-ticket: https?:\/\/\S+\/my-trips\/GBTEST123\/ticket/);
    assert.match(issued.html, /href="https?:\/\/[^"]+\/my-trips\/GBTEST123\/ticket"/);

    const pending = renderTravelEmail({ template: "TICKETING_PENDING", bookingReference: "GBTEST123" });
    assert.equal(/\/ticket\b/.test(pending.text + pending.html), false);
  });
});

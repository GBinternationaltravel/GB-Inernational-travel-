import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BookingStatus } from "@prisma/client";
import {
  assertBookingTransition,
  bookingStepsToTicketingPending,
  canReachTicketingPendingFrom,
  canTransitionBookingStatus,
} from "@/lib/booking/status-transitions";

describe("BOOKING_TRANSITIONS", () => {
  it("does not allow a direct PENDING_PAYMENT → TICKETING_PENDING skip", () => {
    assert.equal(canTransitionBookingStatus("PENDING_PAYMENT", "TICKETING_PENDING"), false);
    assert.equal(canTransitionBookingStatus("PAYMENT_PROCESSING", "TICKETING_PENDING"), false);
  });

  it("allows the legal paid-booking hops only", () => {
    assert.equal(canTransitionBookingStatus("PENDING_PAYMENT", "PAYMENT_RECEIVED"), true);
    assert.equal(canTransitionBookingStatus("PAYMENT_PROCESSING", "PAYMENT_RECEIVED"), true);
    assert.equal(canTransitionBookingStatus("PAYMENT_RECEIVED", "TICKETING_PENDING"), true);
  });

  it("never lists CONFIRMED as an admin-allowed hop from TICKETING_PENDING", () => {
    assert.equal(canTransitionBookingStatus("TICKETING_PENDING", "CONFIRMED"), false);
    assert.throws(
      () => assertBookingTransition("TICKETING_PENDING", "CONFIRMED"),
      /Invalid booking status transition/,
    );
  });

  it("blocks CONFIRMED even if someone asked for it from a listed source", () => {
    assert.throws(
      () => assertBookingTransition("PAYMENT_RECEIVED", "CONFIRMED"),
      /Invalid booking status transition/,
    );
  });
});

describe("bookingStepsToTicketingPending", () => {
  it("walks PENDING_PAYMENT and PAYMENT_PROCESSING through PAYMENT_RECEIVED", () => {
    assert.deepEqual(bookingStepsToTicketingPending("PENDING_PAYMENT"), [
      "PAYMENT_RECEIVED",
      "TICKETING_PENDING",
    ]);
    assert.deepEqual(bookingStepsToTicketingPending("PAYMENT_PROCESSING"), [
      "PAYMENT_RECEIVED",
      "TICKETING_PENDING",
    ]);
    assert.deepEqual(bookingStepsToTicketingPending("PAYMENT_RECEIVED"), ["TICKETING_PENDING"]);
  });

  it("never includes CONFIRMED", () => {
    const statuses: BookingStatus[] = [
      "DRAFT",
      "PENDING_PAYMENT",
      "PAYMENT_PROCESSING",
      "PAYMENT_RECEIVED",
      "TICKETING_PENDING",
      "CONFIRMED",
      "CANCELLED",
      "REFUNDED",
      "FAILED",
      "EXPIRED",
    ];
    for (const status of statuses) {
      assert.ok(!bookingStepsToTicketingPending(status).includes("CONFIRMED"));
    }
  });

  it("marks only payable statuses as able to reach TICKETING_PENDING", () => {
    assert.equal(canReachTicketingPendingFrom("PENDING_PAYMENT"), true);
    assert.equal(canReachTicketingPendingFrom("PAYMENT_PROCESSING"), true);
    assert.equal(canReachTicketingPendingFrom("PAYMENT_RECEIVED"), true);
    assert.equal(canReachTicketingPendingFrom("TICKETING_PENDING"), true);
    assert.equal(canReachTicketingPendingFrom("CONFIRMED"), false);
    assert.equal(canReachTicketingPendingFrom("CANCELLED"), false);
    assert.equal(canReachTicketingPendingFrom("DRAFT"), false);
  });

  it("each collected hop is valid under assertBookingTransition", () => {
    for (const from of ["PENDING_PAYMENT", "PAYMENT_PROCESSING", "PAYMENT_RECEIVED"] as const) {
      let current: BookingStatus = from;
      for (const next of bookingStepsToTicketingPending(from)) {
        assert.doesNotThrow(() => assertBookingTransition(current, next));
        current = next;
      }
      assert.equal(current, "TICKETING_PENDING");
    }
  });
});

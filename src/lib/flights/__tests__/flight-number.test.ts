import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compactFlightNumber,
  formatFlightNumber,
  isAirlineDesignator,
  normalizeFlightNumber,
  snapshotFlightNumber,
  splitFlightNumber,
} from "@/lib/flights/flight-number";
import { airlineCodeFor } from "@/lib/booking/eticket";
import {
  inventoryFlightInputSchema,
  resolveInventoryFlightNumber,
} from "@/services/flight-inventory-service";

describe("airline designators", () => {
  it("accepts letter and digit+letter IATA codes, rejects two digits", () => {
    for (const code of ["PK", "PA", "PF", "ER", "FZ", "9P", "G9", "6E", "3U", "pk", "9p"]) {
      assert.equal(isAirlineDesignator(code), true, code);
    }
    for (const code of ["", "95", "P", "PKX", "9-P"]) {
      assert.equal(isAirlineDesignator(code), false, code);
    }
  });

  it("compacts spacing, hyphens and case", () => {
    assert.equal(compactFlightNumber(" 9p-586 "), "9P586");
    assert.equal(compactFlightNumber("PK 759"), "PK759");
    assert.equal(compactFlightNumber(undefined), "");
  });
});

describe("normalizeFlightNumber with the airline code", () => {
  it("never doubles a digit-led designator (the 9P9P586 bug)", () => {
    for (const raw of ["9P586", "586", "9P 586", "9p-586", "9P9P586", " 9P586 "]) {
      assert.equal(normalizeFlightNumber(raw, "9P"), "9P586", raw);
    }
  });

  it("handles other digit designators", () => {
    assert.equal(normalizeFlightNumber("G9 501", "G9"), "G9501");
    assert.equal(normalizeFlightNumber("1234", "6E"), "6E1234");
    assert.equal(normalizeFlightNumber("6E1234", "6E"), "6E1234");
    assert.equal(normalizeFlightNumber("3U8693", "3U"), "3U8693");
    // A 4-digit number that starts with the code's digit is still a bare number.
    assert.equal(normalizeFlightNumber("9586", "9P"), "9P9586");
  });

  it("keeps letter-only codes working as before", () => {
    assert.equal(normalizeFlightNumber("PK759", "PK"), "PK759");
    assert.equal(normalizeFlightNumber("759", "PK"), "PK759");
    assert.equal(normalizeFlightNumber("PK 759", "PK"), "PK759");
    assert.equal(normalizeFlightNumber("PKPK759", "PK"), "PK759");
    assert.equal(normalizeFlightNumber("PA210", "PA"), "PA210");
    assert.equal(normalizeFlightNumber("ER502", "ER"), "ER502");
    assert.equal(normalizeFlightNumber("FZ332", "FZ"), "FZ332");
    assert.equal(normalizeFlightNumber("PK309A", "PK"), "PK309A");
  });

  it("keeps a different designator instead of prefixing (codeshare / typo)", () => {
    assert.equal(normalizeFlightNumber("EK612", "PK"), "EK612");
    assert.equal(normalizeFlightNumber("9P586", "PF"), "9P586");
  });

  it("returns null for values that are not flight numbers", () => {
    for (const raw of ["", "  ", "9P", "9P9P", "PK", "ABC123", "PK12345", "9P-58-6X1"]) {
      assert.equal(normalizeFlightNumber(raw, "9P"), null, raw);
    }
  });
});

describe("normalizeFlightNumber without an airline code", () => {
  it("reads letter and digit-led designators", () => {
    assert.equal(normalizeFlightNumber("9P586"), "9P586");
    assert.equal(normalizeFlightNumber("9p 586"), "9P586");
    assert.equal(normalizeFlightNumber("9P9P586"), "9P586");
    assert.equal(normalizeFlightNumber("PK759"), "PK759");
    assert.deepEqual(splitFlightNumber("6E1234"), { carrier: "6E", number: "1234" });
    // No letter in the first two characters → bare number, not "95" + "86".
    assert.deepEqual(splitFlightNumber("9586"), { carrier: "", number: "9586" });
  });
});

describe("display helpers", () => {
  it("formatFlightNumber falls back to the original text", () => {
    assert.equal(formatFlightNumber("586", "9P"), "9P586");
    assert.equal(formatFlightNumber("TBA", "9P"), "TBA");
    assert.equal(formatFlightNumber(null), "");
  });

  it("snapshotFlightNumber uses the lower-case airlineId and keeps undefined", () => {
    assert.equal(snapshotFlightNumber({ flightNumber: "586", airlineId: "9p" }), "9P586");
    assert.equal(snapshotFlightNumber({ flightNumber: "9P9P586", airlineId: "9p" }), "9P586");
    assert.equal(snapshotFlightNumber({ flightNumber: "PK759", airlineId: "pk" }), "PK759");
    assert.equal(snapshotFlightNumber({ flightNumber: "", airlineId: "pk" }), undefined);
    assert.equal(snapshotFlightNumber(null), undefined);
  });

  it("e-ticket airline code reads digit-led prefixes and ignores bare numbers", () => {
    assert.equal(airlineCodeFor({ airlineId: "", flightNumber: "9P586" }), "9P");
    assert.equal(airlineCodeFor({ airlineId: "", flightNumber: "586" }), "");
    assert.equal(airlineCodeFor({ airlineId: "9p", flightNumber: "586" }), "9P");
  });
});

describe("admin inventory flight number (resolveRefs)", () => {
  it("stores designator + number for 9P and letter airlines", () => {
    assert.equal(resolveInventoryFlightNumber("9P586", "9P"), "9P586");
    assert.equal(resolveInventoryFlightNumber("586", "9P"), "9P586");
    assert.equal(resolveInventoryFlightNumber("9P586", "9p"), "9P586");
    assert.equal(resolveInventoryFlightNumber("PK759", "PK"), "PK759");
    assert.equal(resolveInventoryFlightNumber("759", "PK"), "PK759");
  });

  it("rejects a flight number for a different airline", () => {
    assert.throws(() => resolveInventoryFlightNumber("EK612", "PK"), /does not match/);
  });

  it("form schema accepts 9P 586 / 586 and rejects junk", () => {
    const base = {
      airlineId: "a1",
      originCode: "LHE",
      destinationCode: "JED",
      cabinClass: "ECONOMY",
      departureTime: "15:20",
      arrivalTime: "18:30",
      startDate: "2026-10-05",
      fare: 50000,
      seats: 10,
    };
    const spaced = inventoryFlightInputSchema.safeParse({ ...base, flightNumber: "9p 586" });
    assert.equal(spaced.success && spaced.data.flightNumber, "9P586");
    const bare = inventoryFlightInputSchema.safeParse({ ...base, flightNumber: "586" });
    assert.equal(bare.success && bare.data.flightNumber, "586");
    const junk = inventoryFlightInputSchema.safeParse({ ...base, flightNumber: "ABC123" });
    assert.equal(junk.success, false);
  });
});

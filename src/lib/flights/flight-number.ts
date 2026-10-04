/**
 * Flight number helpers shared by the inventory service, suppliers, e-ticket and UI.
 *
 * IATA airline designators are two characters and may contain a digit
 * (e.g. 9P Fly Jinnah, G9 Air Arabia, 6E IndiGo, 3U Sichuan), never two digits.
 * Code that only recognised letter prefixes (/^[A-Z]{2}/ or /^\d/ "starts with a
 * digit → add the airline code") treated "9P586" as a bare number and produced
 * "9P9P586". These helpers handle letter and digit designators the same way.
 *
 * Canonical format (unchanged for existing airlines): designator + number, no space,
 * e.g. "PK759", "9P586", "6E1234", "PK309A".
 */

/** Two-character IATA airline designator: letters/digits with at least one letter. */
const DESIGNATOR_PATTERN = /^(?=[A-Z0-9]{2}$)[A-Z0-9]*[A-Z][A-Z0-9]*$/;
/** Numeric part of a flight number: 1–4 digits plus an optional operational suffix. */
const NUMBER_PATTERN = /^\d{1,4}[A-Z]?$/;

/** "586", "309A"; but not a lone digit+letter such as "9P", which is a designator. */
function isNumberPart(value: string): boolean {
  return NUMBER_PATTERN.test(value) && !/^\d[A-Z]$/.test(value);
}

export function isAirlineDesignator(value: string | null | undefined): boolean {
  return DESIGNATOR_PATTERN.test((value ?? "").trim().toUpperCase());
}

/** Upper-case and drop spaces, hyphens and dots: " 9p-586 " → "9P586". */
export function compactFlightNumber(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[\s.\-–—]+/g, "");
}

export type FlightNumberParts = {
  /** Airline designator found in the value (or the expected one), "" if unknown. */
  carrier: string;
  /** Numeric part, e.g. "586" or "309A". */
  number: string;
};

/**
 * Split a flight number into designator and number.
 *
 * With `airlineCode`, every leading copy of that code is removed, so "586", "9P586",
 * "9P 586" and the doubled "9P9P586" all give { carrier: "9P", number: "586" }.
 * Without it, a two-character prefix is only treated as a designator when it contains
 * a letter ("9586" stays a bare number). Returns null when the value is not a flight number.
 */
export function splitFlightNumber(
  value: string | null | undefined,
  airlineCode?: string | null,
): FlightNumberParts | null {
  const compact = compactFlightNumber(value);
  if (!compact) return null;
  const expected = compactFlightNumber(airlineCode);
  const code = isAirlineDesignator(expected) ? expected : "";

  if (code) {
    let rest = compact;
    while (rest.startsWith(code) && rest.length > code.length) rest = rest.slice(code.length);
    if (isNumberPart(rest)) return { carrier: code, number: rest };
  }

  if (isNumberPart(compact)) return { carrier: code, number: compact };

  const prefix = compact.slice(0, 2);
  if (!isAirlineDesignator(prefix)) return null;
  let rest = compact.slice(2);
  while (rest.startsWith(prefix) && rest.length > prefix.length) rest = rest.slice(prefix.length);
  return isNumberPart(rest) ? { carrier: prefix, number: rest } : null;
}

/**
 * Canonical flight number ("9P586", "PK759") or null when the value is not a valid
 * flight number. When `airlineCode` is given and the value has no designator, that
 * code is added; a value carrying a different designator keeps its own.
 */
export function normalizeFlightNumber(
  value: string | null | undefined,
  airlineCode?: string | null,
): string | null {
  const parts = splitFlightNumber(value, airlineCode);
  if (!parts) return null;
  return `${parts.carrier}${parts.number}`;
}

/**
 * Display-safe flight number: the canonical form when it can be parsed, otherwise the
 * trimmed original (never throws, never doubles the airline code).
 */
export function formatFlightNumber(
  value: string | null | undefined,
  airlineCode?: string | null,
): string {
  return normalizeFlightNumber(value, airlineCode) ?? (value ?? "").trim();
}

/**
 * Flight number from a stored offer/booking snapshot (airlineId is the lower-cased IATA
 * code). Keeps `undefined` when the snapshot has no flight number so callers' own
 * fallbacks ("your flight", "—") still apply.
 */
export function snapshotFlightNumber(
  offer: { flightNumber?: string | null; airlineId?: string | null } | null | undefined,
): string | undefined {
  if (!offer?.flightNumber) return undefined;
  return formatFlightNumber(offer.flightNumber, offer.airlineId);
}

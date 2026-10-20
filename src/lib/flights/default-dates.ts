/** UTC calendar dates so server and browser render the same day. */

export function isoDateUTC(offsetDays: number, from = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function addIsoDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Departure a week ahead, return a week after that. Used when a link has no date. */
export function defaultTravelDates(from = new Date()): { departureDate: string; returnDate: string } {
  return {
    departureDate: isoDateUTC(7, from),
    returnDate: isoDateUTC(14, from),
  };
}

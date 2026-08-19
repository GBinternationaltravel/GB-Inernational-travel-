import type { AirlineSummary } from "@/types/flight";

/**
 * Verified airline names/codes used for mock inventory only.
 * Logos are intentionally omitted until legitimate assets are available.
 */
export const airlines: Array<AirlineSummary & { id: string }> = [
  { id: "pk", iataCode: "PK", name: "Pakistan International Airlines" },
  { id: "er", iataCode: "ER", name: "Fly Jinnah" },
  { id: "pa", iataCode: "PA", name: "airblue" },
  { id: "ek", iataCode: "EK", name: "Emirates" },
  { id: "ey", iataCode: "EY", name: "Etihad Airways" },
  { id: "qr", iataCode: "QR", name: "Qatar Airways" },
  { id: "sv", iataCode: "SV", name: "Saudia" },
  { id: "tk", iataCode: "TK", name: "Turkish Airlines" },
  { id: "ba", iataCode: "BA", name: "British Airways" },
  { id: "mh", iataCode: "MH", name: "Malaysia Airlines" },
];

const airlineById = new Map(airlines.map((airline) => [airline.id, airline] as const));
const airlineByCode = new Map(
  airlines.map((airline) => [airline.iataCode.toUpperCase(), airline] as const),
);

export function getAirlineById(id: string) {
  return airlineById.get(id);
}

export function getAirlineByCode(code: string) {
  return airlineByCode.get(code.toUpperCase());
}

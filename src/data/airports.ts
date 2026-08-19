import type { AirportSummary } from "@/types/flight";

/**
 * Curated airport reference data for search autocomplete.
 * Codes are verified IATA codes. Extend this list as needed.
 */
export const airports: AirportSummary[] = [
  // Pakistan
  {
    iataCode: "ISB",
    name: "Islamabad International Airport",
    city: "Islamabad",
    country: "Pakistan",
  },
  {
    iataCode: "LHE",
    name: "Allama Iqbal International Airport",
    city: "Lahore",
    country: "Pakistan",
  },
  {
    iataCode: "KHI",
    name: "Jinnah International Airport",
    city: "Karachi",
    country: "Pakistan",
  },
  {
    iataCode: "PEW",
    name: "Bacha Khan International Airport",
    city: "Peshawar",
    country: "Pakistan",
  },
  {
    iataCode: "UET",
    name: "Quetta International Airport",
    city: "Quetta",
    country: "Pakistan",
  },
  {
    iataCode: "MUX",
    name: "Multan International Airport",
    city: "Multan",
    country: "Pakistan",
  },
  {
    iataCode: "LYP",
    name: "Faisalabad International Airport",
    city: "Faisalabad",
    country: "Pakistan",
  },
  {
    iataCode: "SKT",
    name: "Sialkot International Airport",
    city: "Sialkot",
    country: "Pakistan",
  },
  {
    iataCode: "GIL",
    name: "Gilgit Airport",
    city: "Gilgit",
    country: "Pakistan",
  },
  {
    iataCode: "KDU",
    name: "Skardu Airport",
    city: "Skardu",
    country: "Pakistan",
  },
  {
    iataCode: "GWD",
    name: "Gwadar International Airport",
    city: "Gwadar",
    country: "Pakistan",
  },
  {
    iataCode: "TUK",
    name: "Turbat International Airport",
    city: "Turbat",
    country: "Pakistan",
  },
  // International
  {
    iataCode: "DXB",
    name: "Dubai International Airport",
    city: "Dubai",
    country: "United Arab Emirates",
  },
  {
    iataCode: "AUH",
    name: "Zayed International Airport",
    city: "Abu Dhabi",
    country: "United Arab Emirates",
  },
  {
    iataCode: "SHJ",
    name: "Sharjah International Airport",
    city: "Sharjah",
    country: "United Arab Emirates",
  },
  {
    iataCode: "DOH",
    name: "Hamad International Airport",
    city: "Doha",
    country: "Qatar",
  },
  {
    iataCode: "JED",
    name: "King Abdulaziz International Airport",
    city: "Jeddah",
    country: "Saudi Arabia",
  },
  {
    iataCode: "RUH",
    name: "King Khalid International Airport",
    city: "Riyadh",
    country: "Saudi Arabia",
  },
  {
    iataCode: "MED",
    name: "Prince Mohammad bin Abdulaziz International Airport",
    city: "Madinah",
    country: "Saudi Arabia",
  },
  {
    iataCode: "DMM",
    name: "King Fahd International Airport",
    city: "Dammam",
    country: "Saudi Arabia",
  },
  {
    iataCode: "IST",
    name: "Istanbul Airport",
    city: "Istanbul",
    country: "Turkey",
  },
  {
    iataCode: "LHR",
    name: "London Heathrow Airport",
    city: "London",
    country: "United Kingdom",
  },
  {
    iataCode: "LGW",
    name: "London Gatwick Airport",
    city: "London",
    country: "United Kingdom",
  },
  {
    iataCode: "MAN",
    name: "Manchester Airport",
    city: "Manchester",
    country: "United Kingdom",
  },
  {
    iataCode: "BKK",
    name: "Suvarnabhumi Airport",
    city: "Bangkok",
    country: "Thailand",
  },
  {
    iataCode: "KUL",
    name: "Kuala Lumpur International Airport",
    city: "Kuala Lumpur",
    country: "Malaysia",
  },
  {
    iataCode: "YYZ",
    name: "Toronto Pearson International Airport",
    city: "Toronto",
    country: "Canada",
  },
  {
    iataCode: "JFK",
    name: "John F. Kennedy International Airport",
    city: "New York",
    country: "United States",
  },
  {
    iataCode: "ORD",
    name: "Chicago O'Hare International Airport",
    city: "Chicago",
    country: "United States",
  },
  {
    iataCode: "LAX",
    name: "Los Angeles International Airport",
    city: "Los Angeles",
    country: "United States",
  },
  {
    iataCode: "CDG",
    name: "Paris Charles de Gaulle Airport",
    city: "Paris",
    country: "France",
  },
  {
    iataCode: "FRA",
    name: "Frankfurt Airport",
    city: "Frankfurt",
    country: "Germany",
  },
  {
    iataCode: "FCO",
    name: "Rome Fiumicino Airport",
    city: "Rome",
    country: "Italy",
  },
  {
    iataCode: "AMS",
    name: "Amsterdam Airport Schiphol",
    city: "Amsterdam",
    country: "Netherlands",
  },
  {
    iataCode: "SYD",
    name: "Sydney Airport",
    city: "Sydney",
    country: "Australia",
  },
  {
    iataCode: "MEL",
    name: "Melbourne Airport",
    city: "Melbourne",
    country: "Australia",
  },
];

const airportByCode = new Map(
  airports.map((airport) => [airport.iataCode, airport] as const),
);

export function getAirportByCode(code: string): AirportSummary | undefined {
  return airportByCode.get(code.toUpperCase());
}

export function searchAirports(query: string, limit = 8): AirportSummary[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return airports.slice(0, limit);
  }

  const scored = airports
    .map((airport) => {
      const code = airport.iataCode.toLowerCase();
      const city = airport.city.toLowerCase();
      const name = airport.name.toLowerCase();
      const country = airport.country.toLowerCase();

      let score = 0;
      if (code === normalized) score = 100;
      else if (code.startsWith(normalized)) score = 90;
      else if (city === normalized) score = 80;
      else if (city.startsWith(normalized)) score = 70;
      else if (name.startsWith(normalized)) score = 60;
      else if (city.includes(normalized)) score = 50;
      else if (name.includes(normalized)) score = 40;
      else if (country.includes(normalized)) score = 20;
      else if (code.includes(normalized)) score = 30;

      return { airport, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.airport.city.localeCompare(b.airport.city));

  return scored.slice(0, limit).map((item) => item.airport);
}

import {
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  buildMetadata,
  faqJsonLd,
  travelGuideJsonLd,
} from "@/lib/seo/metadata";
import type { DestinationCity, DestinationCountry } from "@/data/destinations/catalog";
import { destinationPath } from "@/data/destinations/catalog";
import { siteConfig } from "@/config/site";

export function destinationCityMetadata(city: DestinationCity) {
  const path = destinationPath(city.countrySlug, city.citySlug);
  const title = city.hasCommercialAirport
    ? `Flights to ${city.cityName} (${city.iataCode})`
    : `${city.cityName} travel`;
  const isNewNorthernGuide = Boolean(city.tourQuery) || !city.hasCommercialAirport;
  return buildMetadata({
    title,
    description: isNewNorthernGuide
      ? `${city.summary} Seasonal notes are not a live forecast. Ask ${siteConfig.name} for a published fare or a tour.`
      : `${city.summary} Explore airport info, travel tips, weather snapshots, and flight search from Pakistan.`,
    path,
  });
}

export function destinationCountryMetadata(country: DestinationCountry) {
  const path = destinationPath(country.countrySlug);
  return buildMetadata({
    title: `Travel to ${country.countryName}`,
    description: `${country.summary} Browse city guides and flight search options from Pakistan.`,
    path,
  });
}

export function destinationCityJsonLd(city: DestinationCity) {
  const path = destinationPath(city.countrySlug, city.citySlug);
  return [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Destinations", path: "/destinations" },
      { name: city.countryName, path: destinationPath(city.countrySlug) },
      { name: city.cityName, path },
    ]),
    faqJsonLd(city.faqs.map((f) => ({ question: f.question, answer: f.answer }))),
    articleJsonLd({
      title: `${city.cityName} travel guide`,
      description: city.summary,
      path,
    }),
    travelGuideJsonLd({
      title: `${city.cityName} travel guide`,
      description: city.summary,
      path,
      aboutName: city.cityName,
    }),
    {
      "@context": "https://schema.org",
      "@type": "TouristDestination",
      name: city.cityName,
      description: city.summary,
      url: absoluteUrl(path),
      containedInPlace: {
        "@type": "Country",
        name: city.countryName,
      },
      touristType: city.bestFor,
    },
  ];
}

export function destinationCountryJsonLd(country: DestinationCountry) {
  const path = destinationPath(country.countrySlug);
  return [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Destinations", path: "/destinations" },
      { name: country.countryName, path },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "TouristDestination",
      name: country.countryName,
      description: country.summary,
      url: absoluteUrl(path),
    },
  ];
}

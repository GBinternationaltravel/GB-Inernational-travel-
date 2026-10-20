import type { Metadata } from "next";
import Link from "next/link";
import { FlightResultsExperience } from "@/features/flights/components/flight-results-experience";
import { FlightSearchWidget } from "@/features/flights/components/flight-search-widget";
import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildResultsHref, parseAndValidateSearchParams } from "@/lib/flights/search-params";
import { addIsoDays, isoDateUTC } from "@/lib/flights/default-dates";
import { searchFlights, toCustomerSupplierMessage, SupplierError } from "@/services/flight-service";
import { getPublishedFaresUpdatedAt } from "@/providers/flights/inventory-flight-supplier";
import { getFlightSupplierEnv } from "@/config/flight-supplier";
import { FaresUpdatedLine } from "@/components/flights/fares-updated-line";
import { siteConfig } from "@/config/site";
import { whatsappHref } from "@/lib/contact-links";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Flight Results",
    description: "Flight search results for GB International Travel.",
    path: "/flights/results",
    noIndex: true,
  }),
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function FlightResultsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawValue = (key: string) => {
    const value = params[key];
    const text = Array.isArray(value) ? value[0] : value;
    return text?.trim() ?? "";
  };
  const tripRaw = rawValue("trip").toLowerCase();
  const datesWereFilled =
    !rawValue("departure") ||
    ((!tripRaw || tripRaw === "roundtrip") && !rawValue("return"));
  const parsed = parseAndValidateSearchParams(params);
  const flightEnv = getFlightSupplierEnv();
  const publishedFaresUpdatedAt = await getPublishedFaresUpdatedAt();

  if (parsed.success && parsed.data.tripType === "MULTI_CITY") {
    const message = `Hi ${siteConfig.name}, please plan a multi-city trip starting ${parsed.form.origin} to ${parsed.form.destination} on ${parsed.form.departureDate}.`;
    return (
      <Section>
        <Alert variant="info" className="mb-6">
          Multi-city trips are planned with our team on WhatsApp. We confirm each flight before a
          ticket is issued.
        </Alert>
        <a
          href={whatsappHref(siteConfig.contactWhatsApp, message)}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 inline-flex h-12 items-center rounded-md bg-[var(--color-emerald)] px-5 text-sm font-semibold text-white"
        >
          Plan multi-city on WhatsApp
        </a>
        <FlightSearchWidget initialValues={parsed.form} />
      </Section>
    );
  }

  if (!parsed.success) {
    return (
      <Section>
        <Alert variant="error" className="mb-6">
          {parsed.message}
        </Alert>
        <FlightSearchWidget initialValues={parsed.form} />
        <p className="mt-6 text-sm text-[var(--color-muted)]">
          <Link href="/flights" className="text-[var(--color-brand)]">
            Back to flights
          </Link>
        </p>
      </Section>
    );
  }

  let offers: Awaited<ReturnType<typeof searchFlights>>["offers"] = [];
  let returnOffers: Awaited<ReturnType<typeof searchFlights>>["offers"] = [];
  let loadError = false;
  let errorMessage: string | null = null;
  let isMock = true;
  let supplierCode = "MOCK";

  try {
    const result = await searchFlights(parsed.data);
    offers = result.offers;
    isMock = result.isMock;
    supplierCode = result.supplierCode;

    if (parsed.data.tripType === "ROUND_TRIP" && parsed.data.returnDate) {
      const inbound = await searchFlights({
        ...parsed.data,
        tripType: "ONE_WAY",
        origin: parsed.data.destination,
        destination: parsed.data.origin,
        departureDate: parsed.data.returnDate,
        returnDate: undefined,
      });
      returnOffers = inbound.offers;
      isMock = isMock || inbound.isMock;
    }
  } catch (error) {
    loadError = true;
    errorMessage = toCustomerSupplierMessage(error);
    if (error instanceof SupplierError && error.code === "NOT_CONFIGURED") {
      errorMessage =
        "Flight search is not available right now. Please ask us for a quote on WhatsApp or by phone.";
    }
  }

  let nearbyDates: Array<{ date: string; href: string; count: number }> = [];
  if (!loadError && offers.length === 0) {
    const today = isoDateUTC(0);
    const checks = await Promise.all(
      [-3, -2, -1, 1, 2, 3].map(async (offset) => {
        const date = addIsoDays(parsed.data.departureDate, offset);
        if (date < today) return null;
        try {
          const nearby = await searchFlights({
            ...parsed.data,
            tripType: "ONE_WAY",
            departureDate: date,
            returnDate: undefined,
          });
          if (nearby.offers.length === 0) return null;
          return {
            date,
            count: nearby.offers.length,
            href: buildResultsHref({ ...parsed.form, departureDate: date }),
          };
        } catch {
          return null;
        }
      }),
    );
    nearbyDates = checks.filter((item): item is { date: string; href: string; count: number } =>
      Boolean(item),
    );
  }

  const offerUpdated = [...offers, ...returnOffers]
    .map((offer) => offer.fareUpdatedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const faresUpdatedAt = offerUpdated.at(-1) ?? publishedFaresUpdatedAt;

  return (
    <Container className="px-0 sm:px-0 lg:px-0">
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
        <FaresUpdatedLine updatedAt={faresUpdatedAt} />
      </div>
      <FlightResultsExperience
        search={parsed.form}
        datesWereFilled={datesWereFilled}
        nearbyDates={nearbyDates}
        faresUpdatedAt={faresUpdatedAt}
        initialOffers={offers}
        returnOffers={returnOffers}
        loadError={loadError}
        errorMessage={errorMessage}
        isMock={isMock}
        supplierCode={supplierCode}
        supplierEnvironment={
          supplierCode === "TRAVELPORT" ? flightEnv.travelport.environment : null
        }
      />
    </Container>
  );
}

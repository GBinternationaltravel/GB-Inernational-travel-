import type { Metadata } from "next";
import Link from "next/link";
import { FlightResultsExperience } from "@/features/flights/components/flight-results-experience";
import { FlightSearchWidget } from "@/features/flights/components/flight-search-widget";
import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { buildMetadata } from "@/lib/seo/metadata";
import { parseAndValidateSearchParams, parseSearchParams } from "@/lib/flights/search-params";
import { addIsoDays, defaultTravelDates } from "@/lib/flights/default-dates";
import { searchFlights, toCustomerSupplierMessage, SupplierError } from "@/services/flight-service";
import { getFlightSupplierEnv } from "@/config/flight-supplier";

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
  const form = parseSearchParams(params);
  let datesWereFilled = false;
  if (!form.departureDate) {
    const defaults = defaultTravelDates();
    form.departureDate = defaults.departureDate;
    datesWereFilled = true;
  }
  if (form.tripType === "ROUND_TRIP" && !form.returnDate) {
    const candidate = defaultTravelDates().returnDate;
    form.returnDate = candidate > form.departureDate ? candidate : addIsoDays(form.departureDate, 7);
    datesWereFilled = true;
  }
  if (form.tripType !== "ROUND_TRIP") {
    form.returnDate = "";
  }
  const parsed = parseAndValidateSearchParams({
    trip: form.tripType === "ONE_WAY" ? "oneway" : form.tripType === "MULTI_CITY" ? "multicity" : "roundtrip",
    from: form.origin,
    to: form.destination,
    departure: form.departureDate,
    return: form.returnDate || undefined,
    adults: String(form.adults),
    children: form.children ? String(form.children) : undefined,
    infants: form.infants ? String(form.infants) : undefined,
    cabin: form.cabinClass.toLowerCase(),
  });
  const flightEnv = getFlightSupplierEnv();

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
        "Travelport pre-production credentials are not configured. Set FLIGHT_SUPPLIER=mock for development inventory, or configure Travelport sandbox credentials.";
    }
  }

  return (
    <Container className="px-0 sm:px-0 lg:px-0">
      <FlightResultsExperience
        search={parsed.form}
        datesWereFilled={datesWereFilled}
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

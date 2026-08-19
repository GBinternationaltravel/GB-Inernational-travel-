import { getFlightProvider, getFlightSupplier } from "@/providers/registry";
import { flightSearchSchema } from "@/lib/validations/flight";
import type { FlightSearchInput } from "@/lib/validations/flight";
import type {
  CreateBookingInput,
  FlightOffer,
  FlightSearchResult,
  BookingResult,
} from "@/types/flight";
import {
  toSupplierSearchRequest,
  type RevalidateOfferInput,
  type RevalidateOfferResult,
  type SupplierCreateBookingInput,
  type SupplierCreateBookingResult,
  type SupplierHealthStatus,
} from "@/providers/flights/supplier-types";
import { toCustomerSupplierMessage, SupplierError } from "@/providers/flights/supplier-errors";

/**
 * Application flight search service — UI stays supplier-agnostic.
 */
export async function searchFlights(
  input: FlightSearchInput,
): Promise<FlightSearchResult> {
  const params = flightSearchSchema.parse(input);
  const supplier = getFlightSupplier();
  try {
    const result = await supplier.searchFlights(toSupplierSearchRequest(params));
    return {
      offers: result.offers,
      searchedAt: result.searchedAt,
      providerCode: result.supplierCode,
      supplierCode: result.supplierCode,
      isMock: result.isMock,
    };
  } catch (error) {
    if (error instanceof SupplierError && error.code === "NO_AVAILABILITY") {
      return {
        offers: [],
        searchedAt: new Date().toISOString(),
        providerCode: supplier.code,
        supplierCode: supplier.code,
        isMock: supplier.isMock,
      };
    }
    throw error;
  }
}

export async function getFlightOfferById(id: string): Promise<FlightOffer | null> {
  const supplier = getFlightSupplier();
  return supplier.getOffer({ internalOfferId: id });
}

export async function revalidateFlightOffer(
  input: RevalidateOfferInput,
): Promise<RevalidateOfferResult> {
  const supplier = getFlightSupplier();
  return supplier.revalidateOffer(input);
}

export async function createSupplierBooking(
  input: SupplierCreateBookingInput,
): Promise<SupplierCreateBookingResult> {
  const supplier = getFlightSupplier();
  return supplier.createBooking(input);
}

export async function getFlightSupplierHealth(): Promise<SupplierHealthStatus> {
  return getFlightSupplier().getHealthStatus();
}

/** Legacy draft booking path via FlightProvider adapter (unchanged UX). */
export async function createDraftBooking(
  input: CreateBookingInput,
): Promise<BookingResult> {
  const provider = getFlightProvider();
  if (!provider.createBooking) {
    throw new Error(`Provider ${provider.code} does not support booking yet.`);
  }
  return provider.createBooking(input);
}

export { toCustomerSupplierMessage, SupplierError };
